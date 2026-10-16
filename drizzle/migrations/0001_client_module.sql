ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_request_id text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note text;

-- Boutiques actives avec coordonnées et distance (km) depuis un point optionnel
CREATE OR REPLACE FUNCTION public.nearby_shops(_lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL)
RETURNS TABLE(id uuid, code text, name text, address text, phone text, city text, lat double precision, lng double precision, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT s.id, s.code, s.name, s.address, s.phone, c.name,
    CASE WHEN s.location IS NULL THEN NULL ELSE ST_Y(s.location::geometry) END,
    CASE WHEN s.location IS NULL THEN NULL ELSE ST_X(s.location::geometry) END,
    CASE WHEN _lat IS NULL OR _lng IS NULL OR s.location IS NULL THEN NULL
      ELSE ST_Distance(s.location, ST_SetSRID(ST_MakePoint(_lng,_lat),4326)::geography)/1000 END
  FROM public.shops s LEFT JOIN public.cities c ON c.id = s.city_id
  WHERE s.status = 'active'
  ORDER BY 9 NULLS LAST, s.name;
$$;

-- Statistiques agrégées publiques par produit (popularité, notes) — aucune donnée personnelle
CREATE OR REPLACE FUNCTION public.product_stats()
RETURNS TABLE(product_id uuid, sold_qty bigint, avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    COALESCE((SELECT sum(oi.quantity) FROM public.order_items oi JOIN public.orders o ON o.id=oi.order_id JOIN public.product_variants v ON v.id=oi.variant_id WHERE v.product_id=p.id AND o.status <> 'cancelled'),0)
    + COALESCE((SELECT sum(si.quantity) FROM public.sale_items si JOIN public.sales s ON s.id=si.sale_id JOIN public.product_variants v ON v.id=si.variant_id WHERE v.product_id=p.id AND s.channel='pos'),0),
    (SELECT round(avg(r.rating)::numeric,1) FROM public.reviews r WHERE r.product_id=p.id),
    (SELECT count(*) FROM public.reviews r WHERE r.product_id=p.id)
  FROM public.products p WHERE p.is_active;
$$;

-- Création de commande transactionnelle : prix lus en base, stock vérifié et réservé sous verrou
CREATE OR REPLACE FUNCTION public.place_order(_shop_id uuid, _fulfillment public.fulfillment_mode, _address_id uuid, _items jsonb, _request_id text, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); oid uuid; it record; inv public.inventory; price integer; total integer := 0;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'client') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF _request_id IS NOT NULL THEN
    SELECT id INTO oid FROM public.orders WHERE client_request_id=_request_id AND customer_id=uid;
    IF oid IS NOT NULL THEN RETURN oid; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shops WHERE id=_shop_id AND status='active') THEN RAISE EXCEPTION 'shop_unavailable' USING ERRCODE='P0001'; END IF;
  IF _fulfillment <> 'pickup' AND (_address_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.addresses WHERE id=_address_id AND user_id=uid)) THEN
    RAISE EXCEPTION 'address_required' USING ERRCODE='P0001'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items)=0 OR jsonb_array_length(_items)>50 THEN
    RAISE EXCEPTION 'invalid_items' USING ERRCODE='P0001'; END IF;

  INSERT INTO public.orders(customer_id, shop_id, fulfillment, status, address_id, total_xaf, client_request_id, customer_note)
  VALUES (uid, _shop_id, _fulfillment, 'pending', CASE WHEN _fulfillment='pickup' THEN NULL ELSE _address_id END, 0, _request_id, left(_note,500))
  RETURNING id INTO oid;

  FOR it IN SELECT (e->>'variant_id')::uuid AS v, sum((e->>'quantity')::int) AS q FROM jsonb_array_elements(_items) e GROUP BY 1 ORDER BY 1 LOOP
    IF it.q < 1 OR it.q > 99 THEN RAISE EXCEPTION 'invalid_quantity' USING ERRCODE='P0001'; END IF;
    SELECT pv.price_xaf INTO price FROM public.product_variants pv JOIN public.products p ON p.id=pv.product_id
      WHERE pv.id=it.v AND pv.is_active AND p.is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'variant_unavailable:%', it.v USING ERRCODE='P0001'; END IF;
    SELECT * INTO inv FROM public.inventory WHERE shop_id=_shop_id AND variant_id=it.v FOR UPDATE;
    IF NOT FOUND OR inv.quantity - inv.reserved < it.q THEN
      RAISE EXCEPTION 'insufficient_stock:%:%', it.v, CASE WHEN inv IS NULL THEN 0 ELSE inv.quantity - inv.reserved END USING ERRCODE='P0001';
    END IF;
    UPDATE public.inventory SET reserved = reserved + it.q, updated_at=now() WHERE shop_id=_shop_id AND variant_id=it.v;
    INSERT INTO public.stock_movements(shop_id, variant_id, type, delta_quantity, delta_reserved, ref_type, ref_id, reason, actor_id, idempotency_key)
    VALUES (_shop_id, it.v, 'reservation', 0, it.q, 'order', oid, 'Commande en ligne', uid, 'order:'||oid||':reserve:'||it.v);
    INSERT INTO public.order_items(order_id, variant_id, quantity, unit_price_xaf) VALUES (oid, it.v, it.q, price);
    total := total + price * it.q;
  END LOOP;

  UPDATE public.orders SET total_xaf = total WHERE id = oid;
  INSERT INTO public.order_status_history(order_id, status, changed_by, note) VALUES (oid, 'pending', uid, 'Commande créée');
  IF _fulfillment <> 'pickup' THEN
    INSERT INTO public.deliveries(order_id, mode, status) VALUES (oid, _fulfillment, 'pending');
  END IF;
  RETURN oid;
END $$;

-- Annulation par le client tant que la commande est en attente : libère la réservation
CREATE OR REPLACE FUNCTION public.cancel_my_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o public.orders; it record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=_order_id AND customer_id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'not_cancellable' USING ERRCODE='P0001'; END IF;
  FOR it IN SELECT variant_id, quantity FROM public.order_items WHERE order_id=o.id ORDER BY variant_id LOOP
    PERFORM 1 FROM public.inventory WHERE shop_id=o.shop_id AND variant_id=it.variant_id FOR UPDATE;
    UPDATE public.inventory SET reserved = reserved - it.quantity, updated_at=now() WHERE shop_id=o.shop_id AND variant_id=it.variant_id;
    INSERT INTO public.stock_movements(shop_id, variant_id, type, delta_quantity, delta_reserved, ref_type, ref_id, reason, actor_id, idempotency_key)
    VALUES (o.shop_id, it.variant_id, 'release', 0, -it.quantity, 'order', o.id, 'Annulation client', uid, 'order:'||o.id||':release:'||it.variant_id);
  END LOOP;
  UPDATE public.orders SET status='cancelled', updated_at=now() WHERE id=o.id;
  UPDATE public.deliveries SET status='failed', updated_at=now() WHERE order_id=o.id;
  INSERT INTO public.order_status_history(order_id, status, changed_by, note) VALUES (o.id, 'cancelled', uid, 'Annulée par le client');
END $$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, public.fulfillment_mode, uuid, jsonb, text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_my_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, public.fulfillment_mode, uuid, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_shops(double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_stats() TO anon, authenticated;

CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_id, created_at DESC);