# Destyshop — Architecture

Référence : Cahier des charges v2.0 (3 sept. 2026).

## Choix retenus
| Cahier | Retenu | Raison |
|---|---|---|
| Next.js SSR + PWA | React 19 + TypeScript + TanStack Start (SSR), PWA | SSR/SEO équivalents, open source, déployable sur Node, Docker ou edge |
| NestJS / Django | Monolithe modulaire TypeScript (fonctions serveur par domaine) | Autorisé par 5.1 ; modules extractibles plus tard |
| PostgreSQL + PostGIS | PostgreSQL + PostGIS + pg_trgm | Transactions de stock, géospatial |
| JWT + refresh + MFA | Auth Postgres (GoTrue/Supabase, open source, auto-hébergeable) | Conforme 5.5 |
| Elasticsearch | Reporté — full-text Postgres | Volume initial faible |
| Redis + BullMQ | Reporté — table `jobs` + tâches planifiées | Ajout ultérieur sans refonte |
| POS Flutter/PWA | PWA + IndexedDB (outbox) | Même code, hors ligne |
| FCM, SMS, paiements, transporteurs | Interfaces `*Provider` abstraites | Fournisseurs interchangeables |

## Vue d'ensemble
```text
 Site client (PWA)   Back-office   POS (PWA hors ligne)
        \                 |              /
   Couche API : fonctions serveur + /api/public/webhooks/*
   auth/RBAC | catalogue | stock | ventes | paiement | livraison
   élections | litiges | retours | notifications | analytics | audit
              PostgreSQL + PostGIS (RLS, fonctions transactionnelles)
```

## Arborescence cible
```text
src/
  routes/            site client (/, /produits, /boutiques, /panier, /compte…)
    staff/           back-office (tableau de bord, stock, commandes, employés,
                     élections, litiges, retours, réseau, technique, audit)
    pos/             caisse
    api/public/webhooks/  paiement, transporteur
  modules/<domaine>/ *.functions.ts (API) · *.server.ts · schemas.ts · types.ts
  pos/offline/       outbox IndexedDB, synchronisation, cache catalogue
  components/        ui · client · staff · pos
  lib/               rbac, money (XAF), providers/
supabase/migrations/ SQL versionné
docs/                ce dossier
docker-compose.yml   .env.example
```

## Invariants critiques
- **Stock** : toute modification passe par une fonction SQL unique (`apply_stock_movement`) qui verrouille la ligne (`SELECT … FOR UPDATE`), vérifie `quantity >= reserved >= 0`, écrit `stock_movements`, déclenche l'alerte de seuil.
- **En ligne** : réservation à l'initiation du paiement, décrément à la confirmation, libération à l'expiration/annulation.
- **POS** : décrément immédiat. Hors ligne : ventes en file locale avec `idempotency_key`, rejouées par lot ; un stock négatif à la synchro crée un conflit signalé à l'admin boutique (la vente physique a eu lieu).
- **Audit** : déclencheurs sur votes, nominations, ajustements de stock, suppressions de comptes → `audit_logs` (ajout seul).
- **Gouvernance** : seul le Super-Admin réseau convertit un résultat d'élection en mandat.

## Environnements
Dev / recette / production séparés (8.1), configuration par variables d'environnement (`.env.example`).
