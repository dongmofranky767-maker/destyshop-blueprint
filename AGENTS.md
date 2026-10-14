<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Modular monolith: one folder per domain in `src/modules/<domain>/` (`*.functions.ts` API, `*.server.ts` logic); why: modules stay extractible to a separate service later.
- Three surfaces share one API: client site (public routes), back-office (`/staff/*`), POS (`/pos`); why: single source of truth for stock.
- All stock changes go through one transactional SQL function writing `stock_movements`; why: no overselling across channels.
- Roles live in a separate `user_roles` table with optional shop scope, enforced by RLS + API + UI; why: prevents privilege escalation.
- External services (payment, SMS, carrier, maps) behind `*Provider` interfaces; why: vendor-swappable and portable.
- Only standard npm packages; SQL migrations live in `drizzle/migrations/`, dev seed in `supabase/seed.sql`; why: project must run outside Lovable.
- Protected pages live under `src/routes/_authenticated/`; permission gates use `can()` from `src/lib/rbac.ts` in `beforeLoad`; why: one permission map mirrors RLS.
- Money stored as integer XAF; why: no subunit in FCFA.
- Architecture docs live in `docs/`; keep them updated when structure changes.
