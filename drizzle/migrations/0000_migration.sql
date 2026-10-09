-- =========================================================
-- Destyshop — Fondation : identité, RBAC, boutiques, catalogue,
-- stock, ventes, commandes, livraisons, paiements, élections, avis, audit
-- =========================================================
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------- Types ----------
CREATE TYPE public.app_role AS ENUM ('client','employee','shop_admin','network_admin','it_admin');
CREATE TYPE public.account_status AS ENUM ('active','suspended','disabled');
CREATE TYPE public.shop_status AS ENUM ('draft','active','closed');
CREATE TYPE public.sale_channel AS ENUM ('online','pos');
CREATE TYPE public.fulfillment_mode AS ENUM ('pickup','shipping','home_delivery');
CREATE TYPE public.order_status AS ENUM ('pending','paid','preparing','ready','in_transit','delivered','picked_up','cancelled');
CREATE TYPE public.delivery_status AS ENUM ('pending','preparing','in_transit','delivered','failed');
CREATE TYPE public.payment_method AS ENUM ('cash','orange_money','mtn_momo','card');
CREATE TYPE public.payment_status AS ENUM ('pending','succeeded','failed','refunded');
CREATE TYPE public.stock_movement_type AS ENUM ('sale_online','sale_pos','restock','adjustment','return','reservation','release');
CREATE TYPE public.election_status AS ENUM ('draft','open','closed','validated','rerun','cancelled');
CREATE TYPE public.review_target AS ENUM ('product','shop');

-- ---------- Utilitaire updated_at ----------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ---------- Régions / villes ----------
CREATE TABLE public.regions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
CREATE TABLE public.cities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), region_id uuid NOT NULL REFERENCES public.regions(id), name text NOT NULL, UNIQUE(region_id,name));

-- ---------- Boutiques ----------
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city_id uuid REFERENCES public.cities(id),
  address text,
  phone text,
  location extensions.geography(Point,4326),
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.shop_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shops_location_idx ON public.shops USING gist(location);
CREATE TRIGGER shops_updated BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Profils ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  status public.account_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Rôles (table séparée, portée boutique optionnelle) ----------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT shop_scope_ck CHECK (
    (role IN ('employee','shop_admin') AND shop_id IS NOT NULL) OR
    (role IN ('client','network_admin','it_admin') AND shop_id IS NULL))
);
CREATE UNIQUE INDEX user_roles_unique ON public.user_roles(user_id, role, COALESCE(shop_id,'00000000-0000-0000-0000-000000000000'::uuid));

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
CREATE OR REPLACE FUNCTION public.has_shop_role(_user_id uuid, _shop_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND shop_id=_shop_id AND role=_role)
$$;
CREATE OR REPLACE FUNCTION public.is_shop_staff(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND shop_id=_shop_id AND role IN ('employee','shop_admin'))
$$;
CREATE OR REPLACE FUNCTION public.is_network_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'network_admin')
$$;

-- Employés (fiche créée par l'admin de boutique)
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  employee_number text,
  status public.account_status NOT NULL DEFAULT 'active',
  hired_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

-- Mandats d'administrateur de boutique
CREATE TABLE public.shop_admin_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  origin text NOT NULL CHECK (origin IN ('election','appointment')),
  election_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  revoked_reason text,
  appointed_by uuid
);

-- Nouveau compte => profil + rôle client
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, phone, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- Catalogue ----------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_name_trgm ON public.products USING gin (name extensions.gin_trgm_ops);
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  barcode text UNIQUE,
  label text,
  price_xaf integer NOT NULL CHECK (price_xaf >= 0),
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

-- ---------- Stock (unique par boutique, partagé POS / en ligne) ----------
CREATE TABLE public.inventory (
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  alert_threshold integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, variant_id),
  CONSTRAINT inventory_consistency CHECK (reserved >= 0 AND quantity >= reserved)
);
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  type public.stock_movement_type NOT NULL,
  delta_quantity integer NOT NULL DEFAULT 0,
  delta_reserved integer NOT NULL DEFAULT 0,
  ref_type text,
  ref_id uuid,
  reason text,
  actor_id uuid,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (shop_id, variant_id) REFERENCES public.inventory(shop_id, variant_id)
);
CREATE INDEX stock_movements_shop_idx ON public.stock_movements(shop_id, created_at DESC);

-- Point d'entrée unique pour toute modification du stock (verrou de ligne)
CREATE OR REPLACE FUNCTION public.apply_stock_movement(
  _shop_id uuid, _variant_id uuid, _type public.stock_movement_type,
  _delta_quantity integer, _delta_reserved integer,
  _ref_type text DEFAULT NULL, _ref_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL, _idempotency_key text DEFAULT NULL)
RETURNS public.inventory LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.inventory; existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_shop_staff(auth.uid(), _shop_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing FROM public.stock_movements WHERE idempotency_key = _idempotency_key;
    IF existing IS NOT NULL THEN
      SELECT * INTO inv FROM public.inventory WHERE shop_id=_shop_id AND variant_id=_variant_id;
      RETURN inv;
    END IF;
  END IF;
  INSERT INTO public.inventory(shop_id, variant_id) VALUES (_shop_id,_variant_id) ON CONFLICT DO NOTHING;
  SELECT * INTO inv FROM public.inventory WHERE shop_id=_shop_id AND variant_id=_variant_id FOR UPDATE;
  UPDATE public.inventory SET quantity = quantity + _delta_quantity, reserved = reserved + _delta_reserved, updated_at = now()
    WHERE shop_id=_shop_id AND variant_id=_variant_id RETURNING * INTO inv;  -- CHECK empêche la survente
  INSERT INTO public.stock_movements(shop_id, variant_id, type, delta_quantity, delta_reserved, ref_type, ref_id, reason, actor_id, idempotency_key)
  VALUES (_shop_id,_variant_id,_type,_delta_quantity,_delta_reserved,_ref_type,_ref_id,_reason,auth.uid(),_idempotency_key);
  RETURN inv;
END $$;

-- ---------- Commandes ----------
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text, line1 text NOT NULL, city_id uuid REFERENCES public.cities(id),
  location extensions.geography(Point,4326),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('CMD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  fulfillment public.fulfillment_mode NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  address_id uuid REFERENCES public.addresses(id),
  total_xaf integer NOT NULL DEFAULT 0 CHECK (total_xaf >= 0),
  assigned_employee_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_xaf integer NOT NULL CHECK (unit_price_xaf >= 0)
);
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  changed_by uuid, note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Ventes (transaction unifiée) ----------
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.sale_channel NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  order_id uuid UNIQUE REFERENCES public.orders(id),
  employee_id uuid REFERENCES public.profiles(id),
  customer_id uuid REFERENCES public.profiles(id),
  total_xaf integer NOT NULL DEFAULT 0 CHECK (total_xaf >= 0),
  client_uuid text UNIQUE, -- clé d'idempotence POS hors ligne
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sale_channel_ck CHECK ((channel='online' AND order_id IS NOT NULL) OR channel='pos')
);
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_xaf integer NOT NULL CHECK (unit_price_xaf >= 0)
);

-- ---------- Livraisons ----------
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  mode public.fulfillment_mode NOT NULL CHECK (mode IN ('shipping','home_delivery')),
  carrier text, tracking_ref text,
  courier_id uuid REFERENCES public.profiles(id),
  status public.delivery_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Paiements ----------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  order_id uuid REFERENCES public.orders(id),
  method public.payment_method NOT NULL,
  provider text,
  external_ref text UNIQUE,
  amount_xaf integer NOT NULL CHECK (amount_xaf > 0),
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_target_ck CHECK (sale_id IS NOT NULL OR order_id IS NOT NULL)
);
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Élections ----------
CREATE TABLE public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  status public.election_status NOT NULL DEFAULT 'draft',
  reason text,
  opens_at timestamptz, closes_at timestamptz,
  opened_by uuid, validated_by uuid, validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.election_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, user_id)
);
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id),
  candidate_id uuid NOT NULL REFERENCES public.election_candidates(id),
  cast_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_id)
);
ALTER TABLE public.shop_admin_mandates ADD CONSTRAINT mandates_election_fk FOREIGN KEY (election_id) REFERENCES public.elections(id);

-- ---------- Avis ----------
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target public.review_target NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_target_ck CHECK ((target='product' AND product_id IS NOT NULL AND shop_id IS NULL) OR (target='shop' AND shop_id IS NOT NULL AND product_id IS NULL))
);

-- ---------- Audit (ajout seul) & logs techniques ----------
CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  shop_id uuid,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE TABLE public.app_logs (
  id bigserial PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('debug','info','warn','error')),
  source text NOT NULL,
  message text NOT NULL,
  context jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.audit_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec jsonb; sid uuid;
BEGIN
  rec := to_jsonb(COALESCE(NEW, OLD));
  sid := NULLIF(rec->>'shop_id','')::uuid;
  INSERT INTO public.audit_logs(actor_id, action, entity, entity_id, shop_id, data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(rec->>'id', rec->>'variant_id'), sid,
          jsonb_build_object('new', to_jsonb(NEW), 'old', to_jsonb(OLD)));
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER audit_votes AFTER INSERT OR UPDATE OR DELETE ON public.votes FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_mandates AFTER INSERT OR UPDATE OR DELETE ON public.shop_admin_mandates FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_profiles_delete AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_elections AFTER INSERT OR UPDATE ON public.elections FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE OR REPLACE FUNCTION public.audit_stock_adjustment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'adjustment' THEN
    INSERT INTO public.audit_logs(actor_id, action, entity, entity_id, shop_id, data)
    VALUES (NEW.actor_id, 'STOCK_ADJUSTMENT', 'stock_movements', NEW.id::text, NEW.shop_id, to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_stock_adj AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_stock_adjustment();

-- =========================================================
-- GRANTS
-- =========================================================
GRANT SELECT ON public.regions, public.cities, public.shops, public.categories, public.products, public.product_variants, public.product_images, public.inventory, public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apply_stock_movement TO authenticated, service_role;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_admin_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Référentiels publics
CREATE POLICY "public read regions" ON public.regions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read cities" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "network manage regions" ON public.regions FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));
CREATE POLICY "network manage cities" ON public.cities FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));

-- Boutiques
CREATE POLICY "public read active shops" ON public.shops FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "staff read own shop" ON public.shops FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), id) OR public.is_network_admin(auth.uid()) OR public.has_role(auth.uid(),'it_admin'));
CREATE POLICY "network manage shops" ON public.shops FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));

-- Profils
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_network_admin(auth.uid()) OR public.has_role(auth.uid(),'it_admin'));
CREATE POLICY "shop admin read staff profiles" ON public.profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = profiles.id AND public.has_shop_role(auth.uid(), e.shop_id, 'shop_admin')));
CREATE POLICY "it manage profile status" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'it_admin')) WITH CHECK (public.has_role(auth.uid(),'it_admin'));

-- Rôles : lecture de ses rôles ; IT gère les accès ; Super-admin gère rôles boutique ; admin boutique gère employés de sa boutique
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_network_admin(auth.uid()) OR public.has_role(auth.uid(),'it_admin') OR (shop_id IS NOT NULL AND public.has_shop_role(auth.uid(), shop_id, 'shop_admin')));
CREATE POLICY "it manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'it_admin')) WITH CHECK (public.has_role(auth.uid(),'it_admin'));
CREATE POLICY "network manage shop roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_network_admin(auth.uid()) AND role IN ('employee','shop_admin')) WITH CHECK (public.is_network_admin(auth.uid()) AND role IN ('employee','shop_admin'));
CREATE POLICY "shop admin manage employees role" ON public.user_roles FOR ALL TO authenticated USING (role = 'employee' AND public.has_shop_role(auth.uid(), shop_id, 'shop_admin')) WITH CHECK (role = 'employee' AND public.has_shop_role(auth.uid(), shop_id, 'shop_admin'));

-- Employés
CREATE POLICY "employee read self" ON public.employees FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "shop staff read colleagues" ON public.employees FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()));
CREATE POLICY "shop admin manage employees" ON public.employees FOR ALL TO authenticated USING (public.has_shop_role(auth.uid(), shop_id, 'shop_admin')) WITH CHECK (public.has_shop_role(auth.uid(), shop_id, 'shop_admin'));

-- Mandats
CREATE POLICY "read mandates" ON public.shop_admin_mandates FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()));
CREATE POLICY "network manage mandates" ON public.shop_admin_mandates FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));

-- Catalogue
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read products" ON public.products FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "network manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));
CREATE POLICY "network manage products" ON public.products FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));
CREATE POLICY "network manage variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));
CREATE POLICY "network manage images" ON public.product_images FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));

-- Stock : lecture publique (disponibilité), écriture uniquement via apply_stock_movement
CREATE POLICY "public read inventory" ON public.inventory FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff update thresholds" ON public.inventory FOR UPDATE TO authenticated USING (public.has_shop_role(auth.uid(), shop_id, 'shop_admin')) WITH CHECK (public.has_shop_role(auth.uid(), shop_id, 'shop_admin'));
REVOKE INSERT, DELETE ON public.inventory FROM authenticated;
REVOKE UPDATE ON public.inventory FROM authenticated;
GRANT UPDATE (alert_threshold) ON public.inventory TO authenticated;
CREATE POLICY "staff read movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.stock_movements FROM authenticated;

-- Adresses
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Commandes
CREATE POLICY "customer read own orders" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "staff read shop orders" ON public.orders FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()));
CREATE POLICY "staff update shop orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id)) WITH CHECK (public.is_shop_staff(auth.uid(), shop_id));
CREATE POLICY "read order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_shop_staff(auth.uid(), o.shop_id) OR public.is_network_admin(auth.uid()))));
CREATE POLICY "read order history" ON public.order_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_shop_staff(auth.uid(), o.shop_id) OR public.is_network_admin(auth.uid()))));
-- La création de commande passera par une fonction serveur transactionnelle (module orders)
REVOKE INSERT, DELETE ON public.orders, public.order_items, public.order_status_history FROM authenticated;

-- Ventes
CREATE POLICY "staff read shop sales" ON public.sales FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()) OR customer_id = auth.uid());
CREATE POLICY "read sale items" ON public.sale_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (public.is_shop_staff(auth.uid(), s.shop_id) OR public.is_network_admin(auth.uid()) OR s.customer_id = auth.uid())));
REVOKE INSERT, UPDATE, DELETE ON public.sales, public.sale_items FROM authenticated;

-- Livraisons
CREATE POLICY "read deliveries" ON public.deliveries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_shop_staff(auth.uid(), o.shop_id) OR public.is_network_admin(auth.uid()))));
CREATE POLICY "staff update deliveries" ON public.deliveries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_shop_staff(auth.uid(), o.shop_id)));
REVOKE INSERT, DELETE ON public.deliveries FROM authenticated;

-- Paiements (écriture serveur uniquement)
CREATE POLICY "read payments" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.is_shop_staff(auth.uid(), o.shop_id) OR public.is_network_admin(auth.uid())))
  OR EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (public.is_shop_staff(auth.uid(), s.shop_id) OR public.is_network_admin(auth.uid()))));
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;

-- Élections (votes nominatifs, non anonymes)
CREATE POLICY "read elections" ON public.elections FOR SELECT TO authenticated USING (public.is_shop_staff(auth.uid(), shop_id) OR public.is_network_admin(auth.uid()));
CREATE POLICY "network manage elections" ON public.elections FOR ALL TO authenticated USING (public.is_network_admin(auth.uid())) WITH CHECK (public.is_network_admin(auth.uid()));
CREATE POLICY "read candidates" ON public.election_candidates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND (public.is_shop_staff(auth.uid(), e.shop_id) OR public.is_network_admin(auth.uid()))));
CREATE POLICY "staff self candidacy" ON public.election_candidates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.status = 'open' AND public.is_shop_staff(auth.uid(), e.shop_id)));
CREATE POLICY "read votes" ON public.votes FOR SELECT TO authenticated USING (voter_id = auth.uid() OR public.is_network_admin(auth.uid()));
CREATE POLICY "staff cast vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (voter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id AND e.status = 'open' AND public.is_shop_staff(auth.uid(), e.shop_id)));
REVOKE UPDATE, DELETE ON public.votes FROM authenticated;

-- Avis
CREATE POLICY "public read reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "author write review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "author edit review" ON public.reviews FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "author delete review" ON public.reviews FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Audit / logs
CREATE POLICY "read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_network_admin(auth.uid()) OR public.has_role(auth.uid(),'it_admin') OR (shop_id IS NOT NULL AND public.has_shop_role(auth.uid(), shop_id, 'shop_admin')));
REVOKE INSERT ON public.audit_logs FROM authenticated;
CREATE POLICY "it read app logs" ON public.app_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'it_admin'));
CREATE POLICY "users write app logs" ON public.app_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
REVOKE UPDATE, DELETE ON public.app_logs FROM authenticated;

-- Fonctions de rôle utilisables par les utilisateurs connectés
GRANT EXECUTE ON FUNCTION public.has_role, public.has_shop_role, public.is_shop_staff, public.is_network_admin TO authenticated;
