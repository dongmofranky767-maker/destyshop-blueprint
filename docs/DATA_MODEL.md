# Modèle de données (prévu)

## Entités
- **Identité** : `profiles`, `user_roles(user_id, role, shop_id NULL)`, `employees(shop_id, user_id, matricule, status)`
- **Boutiques** : `regions`, `cities`, `shops(location geography(Point), opening_hours jsonb, status)`, `shop_admin_mandates(shop_id, user_id, started_at, ended_at, origin election|appointment, election_id, revoked_reason)`
- **Catalogue** : `categories(parent_id)`, `products`, `product_variants(sku, barcode, price_xaf)`, `product_images`, `promotions(scope network|shop|zone)`
- **Stock** : `inventory(shop_id, variant_id, quantity, reserved, alert_threshold)` ; `stock_movements(type sale_online|sale_pos|restock|adjustment|return|reservation|release, delta, ref_type, ref_id, actor_id, idempotency_key UNIQUE)`
- **Ventes** : `sales(channel online|pos, shop_id, employee_id, customer_id, order_id, total_xaf, status)`, `sale_items`
- **Commandes** : `orders(customer_id, shop_id, fulfillment pickup|shipping|home_delivery, status)`, `order_items`, `order_status_history`, `addresses(location geography)`
- **Livraison** : `deliveries(order_id, carrier, tracking_ref, courier_id, status)`, `delivery_zones(area geography(Polygon), fee_xaf)`
- **Paiements** : `payments(sale_id|order_id, method cash|orange_money|mtn_momo|card, provider, external_ref, status)`, `refunds`, `receipts`
- **Retours** : `returns`, `return_items`
- **Gouvernance** : `elections(shop_id, round, status draft|open|closed|validated|rerun, opens_at, closes_at)`, `election_candidates`, `votes(election_id, voter_id, candidate_id, cast_at, UNIQUE(election_id, voter_id))`, `disputes`, `dispute_messages`
- **Transverse** : `reviews(target product|shop)`, `notifications`, `notification_preferences`, `audit_logs`, `pos_devices`, `pos_sync_batches`, `settings`, `jobs`

## Relations
```text
shops 1─n employees n─1 profiles 1─n user_roles
shops 1─n inventory n─1 product_variants n─1 products n─1 categories
inventory 1─n stock_movements ─> (sales | orders | returns)
orders 1─1 sales 1─n payments ; orders 1─0..1 deliveries
pos sale  = sales(channel=pos) 1─n payments, 1─1 receipts
elections n─1 shops ; elections 1─n candidates, 1─n votes ; validated election ─> shop_admin_mandates
```
Montants en entiers XAF (pas de centimes).
