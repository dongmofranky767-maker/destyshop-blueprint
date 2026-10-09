# Modules API (fonctions serveur par domaine)

| Module | Opérations |
|---|---|
| auth / profiles | inscription (email, téléphone), profil, MFA |
| shops | CRUD, horaires, boutiques proches (`ST_DWithin`, rayon paramétrable) |
| catalog | recherche/filtres, fiche, disponibilité par boutique |
| inventory | mouvement, ajustement, validation, alertes seuil, (transfert ?) |
| cart / orders | création, affectation boutique, statut, historique |
| pos | vente, synchronisation par lot idempotente, reçu |
| payments | initier, webhook `/api/public/webhooks/paiement`, rapprochement, remboursement |
| delivery | zones, tarifs, suivi, webhook transporteur |
| recommendations | proximité + stock + historique + popularité + promotions |
| elections | ouvrir, candidater, voter, clôturer, nommer, révoquer, nouveau tour |
| disputes | créer, échanger, arbitrer |
| returns | demande, validation, réintégration stock, remboursement |
| reviews | noter produit/boutique |
| notifications | in-app, SMS, push (via providers) |
| analytics | produits, ventes (période/boutique/région/canal), employés, réseau |
| audit | consultation filtrée |
| admin IT | paramètres, comptes, incidents |

Les webhooks sous `/api/public/` vérifient la signature du fournisseur avant toute écriture.
