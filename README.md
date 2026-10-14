# Destyshop — Plateforme e-commerce omnicanale (Cameroun)

Site client (PWA), back-office et caisse POS sur une seule base de code TypeScript.
Architecture détaillée : [`docs/`](docs/ARCHITECTURE.md).

## Stack
- React 19 + TypeScript + TanStack Start (SSR) + Vite, Tailwind CSS v4, composants shadcn/ui
- Fonctions serveur TypeScript par domaine (`src/modules/<domaine>/*.functions.ts`)
- PostgreSQL + PostGIS, authentification JWT/refresh (GoTrue) et sécurité par ligne (RLS) — pile Supabase open source, auto-hébergeable
- Validation : Zod. Logs techniques : JSON structuré (`src/lib/logger.ts`)

## Prérequis
- Node.js 20+ et npm (ou Bun)
- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker (lance Postgres/PostGIS, Auth et l'API REST en local)
- `psql` (client PostgreSQL)

## Installation locale
```bash
npm install
cp .env.example .env
npm run db:start            # démarre la pile locale ; affiche l'URL API, la clé publique et l'URL Postgres
# reporter ces valeurs dans .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL)
npm run db:reset            # applique les migrations puis le seed de développement
npm run dev                 # http://localhost:8080
```

## Scripts
| Script | Rôle |
|---|---|
| `dev` / `build` / `preview` | Serveur de dev, build de production, aperçu |
| `typecheck` / `lint` / `test` | Vérifications TypeScript, ESLint, Vitest |
| `db:start` / `db:stop` | Pile base de données locale |
| `db:migrate` | Applique `drizzle/migrations/*.sql` sur `DATABASE_URL` |
| `db:seed` | Charge `supabase/seed.sql` (données + comptes de test) |
| `db:reset` | Migrations + seed |

## Comptes de test (développement uniquement)
Mot de passe commun : `Destyshop!2026`

| Rôle | Email |
|---|---|
| Client | client@destyshop.test |
| Employé (Douala Akwa) | employe@destyshop.test |
| Administrateur de boutique (Douala Akwa) | admin.boutique@destyshop.test |
| Super-Administrateur réseau | superadmin@destyshop.test |
| Administrateur technique IT | it@destyshop.test |

⚠ Supprimer ces comptes avant toute mise en production.

## Structure
```text
src/
  routes/                 pages (fichier = URL)
    index.tsx, auth.tsx, acces-refuse.tsx         public
    _authenticated/       exige une session
      compte.tsx          espace client
      staff*.tsx          back-office (accès personnel)
      pos.tsx             caisse (employé / admin boutique)
  modules/                API par domaine (auth, shops, users, system…)
  lib/                    rbac, errors, logger, env, money
  components/             ui (shadcn) + brand
drizzle/migrations/       schéma SQL versionné
supabase/seed.sql         données de développement
docs/                     architecture, modèle de données, RBAC, API, décisions
```

## Sécurité
- Rôles dans `user_roles` (jamais sur le profil), portée boutique pour employé/admin boutique.
- Contrôle à trois niveaux : RLS en base (autorité), fonctions serveur, interface.
- Le stock ne se modifie que via `apply_stock_movement` (verrou de ligne, contrainte `quantity >= reserved >= 0`, historique, idempotence).
- Votes, nominations, changements de rôles, ajustements de stock et suppressions de comptes sont journalisés automatiquement dans `audit_logs`.

## Déploiement
Le build produit une application Node/edge standard (Nitro). Toute plateforme compatible (Docker, Node, Cloudflare…) convient ; la base peut être Supabase hébergé ou auto-hébergé.
