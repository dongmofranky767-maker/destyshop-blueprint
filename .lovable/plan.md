# Destyshop — Étape 1 : analyse, architecture et préparation

Cahier des charges v2.0 lu en entier (sections 1 à 11). Cette étape ne code aucune fonctionnalité métier. Elle livre le dossier d'architecture dans le projet, le squelette de navigation et l'identité visuelle tirée du logo (noir, rose framboise, blanc, « Le plaisir à petit prix »).

## 1. Architecture retenue (et pourquoi elle diffère un peu du cahier)

Le cahier (5.1) autorise « un monolithe bien structuré en modules ». C'est ce que nous retenons pour une première version réaliste.

| Recommandation du cahier | Choix retenu | Raison |
|---|---|---|
| Next.js SSR + PWA | React 19 + TypeScript + TanStack Start (SSR), PWA | Même rôle que Next.js (SSR, référencement). C'est le framework imposé par cet environnement de travail. Open source, il tourne sur Node, Docker ou Cloudflare. |
| NestJS / Django | Fonctions serveur TypeScript organisées par domaine, dans la même base de code | Un seul langage et un seul déploiement. Les modules sont découpés pour pouvoir être extraits plus tard vers NestJS si besoin. |
| PostgreSQL + PostGIS | PostgreSQL + PostGIS + pg_trgm, via Lovable Cloud | Lovable Cloud repose sur Supabase, qui est open source et auto-hébergeable (Docker). Les migrations SQL sont standard et versionnées dans le dépôt. |
| Auth JWT + refresh + MFA | Auth Lovable Cloud (JWT + refresh, email/téléphone, MFA TOTP) | Correspond exactement au point 5.5. |
| Elasticsearch | Reporté. Recherche plein texte Postgres + trigrammes | Suffit pour démarrer. Peut être ajouté plus tard sans toucher au modèle. |
| Redis + BullMQ | Reporté. Table `jobs` + tâches planifiées | À introduire quand le volume l'exigera. |
| POS Flutter ou PWA | PWA (même code web), stockage local IndexedDB | Un seul langage, fonctionne sur tablette bas coût, mode hors ligne. |
| FCM + SMS | Interfaces « fournisseur » abstraites (`NotificationProvider`, `PaymentProvider`, `CarrierProvider`) | Les fournisseurs restent remplaçables (voir section 9). |

Portabilité : uniquement des paquets npm standard, du SQL standard, des variables d'environnement documentées et un `docker-compose` de développement (Postgres/PostGIS). Aucun service propriétaire indispensable.

```text
 Site client (PWA)   Back-office   POS (PWA hors ligne)
        \                 |              /
         +--- Couche API (fonctions serveur + routes /api/public pour webhooks) ---+
         |  auth/RBAC | catalogue | stock | ventes | paiement | livraison |
         |  élections | notifications | analytics | audit                      |
         +------------------- PostgreSQL + PostGIS (RLS) ----------------------+
```

## 2. Arborescence

```text
src/
  routes/
    index.tsx, produits/, produit.$slug.tsx, boutiques/, panier.tsx,
    commande/, compte/                      -> site client
    connexion.tsx, inscription.tsx
    _staff/                                 -> back-office protégé
      tableau-de-bord.tsx, stock/, commandes/, employes/, ventes/,
      elections/, litiges/, retours/, reseau/ (super-admin), parametres/,
      technique/ (IT), audit/
    pos/                                    -> interface caisse
    api/public/webhooks/{paiement,transporteur}.ts
  modules/<domaine>/                        -> un dossier par domaine
    *.functions.ts (API), *.server.ts (logique), schemas.ts (zod), types.ts
    domaines : auth, shops, catalog, inventory, orders, sales, payments,
               delivery, geo, recommendations, elections, notifications,
               analytics, audit, disputes, returns, reviews
  pos/offline/ (outbox IndexedDB, synchronisation, cache catalogue)
  components/ (ui, client, staff, pos)
  lib/ (rbac, money XAF, formatage, providers/)
supabase/migrations/   docs/ (ARCHITECTURE, DATA_MODEL, RBAC, API, DECISIONS)
docker-compose.yml   .env.example   AGENTS.md
```

## 3. Modules principaux

Utilisateurs & rôles · Boutiques · Catalogue · Stock omnicanal · Commandes en ligne · Ventes POS · Paiements et rapprochement · Livraison/expédition/retrait · Géolocalisation et suggestions · Élections · Litiges · Retours/remboursements · Avis · Notifications · Analytics · Audit.

## 4. Rôles et permissions (RBAC)

Les rôles sont stockés dans une table séparée et rattachés à une boutique quand c'est pertinent.

| Rôle | Portée | Principaux droits |
|---|---|---|
| client | soi-même | catalogue, panier, commande, paiement, suivi, avis |
| employee | sa boutique | POS, mouvements de stock, traitement des commandes, ses statistiques, vote/candidature |
| shop_admin | sa boutique | + gestion des employés, validation du stock, KPI boutique, remontée de litiges |
| network_admin | réseau | élections, nomination/révocation, vue consolidée, litiges, règles globales (zones, promotions) |
| it_admin | technique | paramètres système, accès, incidents, journaux. Aucun droit commercial |

Ces droits sont appliqués trois fois : dans la base (règles d'accès par ligne via `has_role`), dans l'API (contrôle de permission) et dans l'interface (masquage). MFA obligatoire pour shop_admin, network_admin et it_admin.

## 5. Modèle de données

- Identité : `profiles`, `user_roles(user_id, role, shop_id?)`, `employees(shop_id, user_id, matricule, statut)`
- Boutiques : `regions`, `cities`, `shops(location geography(Point), horaires, statut)`, `shop_admin_mandates(début, fin, origine: élection/nomination, révoqué)`
- Catalogue : `categories` (arborescence), `products`, `product_variants(sku, code_barres, prix)`, `product_images`, `promotions`
- Stock : `inventory(shop_id, variant_id, quantité, réservé, seuil_alerte)` sous contrainte `quantité >= réservé >= 0` ; `stock_movements` (type, delta, source, référence, auteur, idempotency_key)
- Ventes : `sales` (table unifiée : channel `online`/`pos`), `sale_items`
- Commandes : `orders(mode: pickup/shipping/home_delivery, statut)`, `order_items`, `order_status_history`, `addresses(geography)`
- Livraison : `deliveries(transporteur, suivi, livreur)`, `delivery_zones(polygone, tarif)`
- Paiements : `payments(méthode, fournisseur, référence externe, statut)`, `refunds`, `receipts`
- Retours : `returns`, `return_items`
- Gouvernance : `elections(shop_id, statut, tour, dates)`, `election_candidates`, `votes` (nominatif, unique par électeur et élection, horodaté), `disputes`, `dispute_messages`
- Divers : `reviews` (produit ou boutique), `notifications`, `notification_preferences`, `audit_logs` (ajout seul, jamais modifiable), `pos_devices`, `pos_sync_batches`, `settings`

## 6. Relations et invariants clés

- Une vente = 1 commande (en ligne) OU 1 ticket POS. Elle porte les paiements et les mouvements de stock.
- Stock : toute modification passe par une seule fonction SQL transactionnelle qui verrouille la ligne et écrit le mouvement. Commande en ligne : réservation au paiement initié, décrément à la confirmation, libération en cas d'expiration ou d'annulation. Le POS décrémente immédiatement.
- POS hors ligne : ventes stockées localement avec une clé d'idempotence, puis rejouées. Si le stock est insuffisant au moment de la synchronisation, un conflit est signalé à l'administrateur de la boutique (la vente physique a déjà eu lieu).
- Élection → mandat : seul network_admin peut transformer un résultat en mandat, et chaque étape est auditée.
- Les votes, nominations, ajustements de stock et suppressions de comptes écrivent automatiquement dans `audit_logs` (déclencheurs).

## 7. API par domaine (fonctions serveur)

auth/profils · shops (CRUD, boutiques proches) · catalog (recherche, filtres, disponibilité par boutique) · inventory (mouvement, ajustement, transfert ?, alertes) · cart/orders (création, statut, affectation à une boutique) · pos (vente, synchronisation par lot, reçu) · payments (initier, webhook, rapprochement, remboursement) · delivery (zones, tarifs, suivi, webhook transporteur) · recommendations · elections (ouvrir, candidater, voter, clôturer, nommer, révoquer, nouveau tour) · disputes · returns · reviews · notifications · analytics (produits, ventes, employés, réseau) · audit (consultation) · admin IT.

## 8. Priorités de développement

1. Socle : Lovable Cloud, schéma identité/rôles/boutiques, auth, RBAC, audit, charte graphique, coquilles des trois interfaces.
2. Catalogue + stock transactionnel + mouvements + alertes (avec test de concurrence).
3. POS en ligne puis hors ligne avec synchronisation.
4. Site client : catalogue, boutiques proches (PostGIS), panier, commande, 3 modes de réception, suivi.
5. Paiements (à confirmer : bac à sable fournisseur) et rapprochement.
6. Back-office admin + tableaux de bord analytics.
7. Élections et mandats, litiges.
8. Notifications (in-app, puis SMS/push), retours, avis, suggestions.

## 9. Points à décider (absents ou flous dans le cahier)

1. « Six rôles » (5.5) alors que le tableau n'en liste que cinq : un sixième (livreur ? caissier ?) est-il prévu ?
2. Fournisseur de paiement : CinetPay (agrège OM, MoMo et cartes) ou intégrations directes ? Stripe ne fonctionne pas pour un marchand camerounais.
3. Fournisseurs SMS, push et transporteurs : à nommer.
4. Élection : durée, quorum, règle d'égalité, durée du mandat, qui peut être candidat, conditions d'une révocation par vote.
5. Prix : uniques au niveau réseau ou par boutique ? Variantes (tailles, couleurs) ?
6. Commande multi-boutiques : un panier peut-il contenir des articles venant de plusieurs boutiques ?
7. Livraison : zones, tarifs, livreurs internes ou externes ?
8. Retours et remboursements : délais et conditions.
9. Reçus : mentions fiscales obligatoires (NIU, TVA 19,25 %) ?
10. Litiges : définition, workflow, acteurs.
11. Transferts de stock entre boutiques : souhaités ?
12. Cartographie : Google Maps (payant) ou OpenStreetMap/Leaflet (gratuit) ?
13. Langues : français seulement, ou français et anglais ?
14. Charte graphique complète : seul le logo est fourni. La palette sera dérivée du logo.

## Livrables de cette étape (après approbation)

- `docs/` : ARCHITECTURE.md, DATA_MODEL.md (avec diagramme), RBAC.md (matrice), API.md, DECISIONS.md (les points ci-dessus) et `roadmap.md`.
- `AGENTS.md` : règles d'architecture.
- Charte graphique (couleurs du logo, typographies), logo intégré, page d'accueil vitrine provisoire, coquilles vides site client / back-office / POS.
- `.env.example` et `docker-compose.yml` (PostGIS).
- Aucune base de données ni fonctionnalité métier à ce stade. Lovable Cloud sera activé à l'étape suivante (socle).
