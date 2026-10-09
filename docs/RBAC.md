# Rôles et permissions

Rôles dans `user_roles` (jamais sur le profil), portée boutique optionnelle. Vérifiés en base (RLS via `has_role`/`has_shop_role`), dans l'API et dans l'interface. MFA obligatoire pour shop_admin, network_admin, it_admin.

| Permission | client | employee | shop_admin | network_admin | it_admin |
|---|---|---|---|---|---|
| Catalogue, commander, suivre, noter | ✓ | | | | |
| POS : vendre, reçu | | sa boutique | sa boutique | | |
| Mouvements de stock | | sa boutique | sa boutique + validation | lecture réseau | |
| Traiter commandes boutique | | ✓ | ✓ | lecture | |
| Ses statistiques | | ✓ | ✓ | | |
| Gérer employés | | | sa boutique | | |
| KPI boutique / employés | | | sa boutique | toutes | |
| Candidater / voter | | sa boutique | sa boutique | | |
| Ouvrir élection, nommer, révoquer, nouveau tour | | | | ✓ | |
| Litiges | | | remonter | arbitrer | |
| Règles globales (zones, promotions réseau) | | | | ✓ | |
| Paramètres système, accès, incidents | | | | | ✓ |
| Journal d'audit | | | sa boutique | ✓ | ✓ (technique) |

L'it_admin n'a **aucun** droit commercial ni de gouvernance (3.2).
Le cahier mentionne « six rôles » (5.5) mais n'en définit que cinq — voir DECISIONS.md.
