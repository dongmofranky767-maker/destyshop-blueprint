-- =========================================================
-- Destyshop — Seed de DÉVELOPPEMENT (idempotent)
-- ⚠ Ne jamais exécuter en production. Supprimer les comptes de test avant mise en ligne.
-- Mot de passe de tous les comptes de test : Destyshop!2026
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO public.regions(id,name) VALUES
 ('10000000-0000-0000-0000-000000000001','Littoral'),
 ('10000000-0000-0000-0000-000000000002','Centre')
ON CONFLICT DO NOTHING;
INSERT INTO public.cities(id,region_id,name) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Douala'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Yaoundé')
ON CONFLICT DO NOTHING;

-- Boutiques fictives (données de démonstration)
INSERT INTO public.shops(id,code,name,city_id,address,location,status) VALUES
 ('30000000-0000-0000-0000-000000000001','DLA-01','Destyshop Douala Akwa','20000000-0000-0000-0000-000000000001','Akwa, Douala', extensions.ST_GeogFromText('POINT(9.7043 4.0511)'),'active'),
 ('30000000-0000-0000-0000-000000000002','YDE-01','Destyshop Yaoundé Centre','20000000-0000-0000-0000-000000000002','Centre-ville, Yaoundé', extensions.ST_GeogFromText('POINT(11.5021 3.8480)'),'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories(id,name,slug) VALUES
 ('40000000-0000-0000-0000-000000000001','Mode','mode'),
 ('40000000-0000-0000-0000-000000000002','Beauté','beaute')
ON CONFLICT DO NOTHING;
INSERT INTO public.products(id,category_id,name,slug,description) VALUES
 ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Robe pagne','robe-pagne','Produit de démonstration'),
 ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Parfum Desty','parfum-desty','Produit de démonstration')
ON CONFLICT DO NOTHING;
INSERT INTO public.product_variants(id,product_id,sku,barcode,label,price_xaf) VALUES
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','ROBE-M','2000000000011','Taille M',15000),
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','PARF-50','2000000000028','50 ml',8500)
ON CONFLICT DO NOTHING;
INSERT INTO public.inventory(shop_id,variant_id,quantity,alert_threshold) VALUES
 ('30000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',20,5),
 ('30000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',12,3),
 ('30000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001',8,5)
ON CONFLICT DO NOTHING;

-- Comptes de test (le trigger handle_new_user crée profil + rôle client)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('a0000000-0000-0000-0000-000000000001'::uuid,'client@destyshop.test','Cliente Test'),
    ('a0000000-0000-0000-0000-000000000002'::uuid,'employe@destyshop.test','Employé Douala'),
    ('a0000000-0000-0000-0000-000000000003'::uuid,'admin.boutique@destyshop.test','Admin Boutique Douala'),
    ('a0000000-0000-0000-0000-000000000004'::uuid,'superadmin@destyshop.test','Super-Admin Réseau'),
    ('a0000000-0000-0000-0000-000000000005'::uuid,'it@destyshop.test','Admin Technique')
  ) AS t(id,email,name) LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = r.id) THEN
      INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
      VALUES ('00000000-0000-0000-0000-000000000000',r.id,'authenticated','authenticated',r.email,
        extensions.crypt('Destyshop!2026', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name',r.name), now(), now(),'','','','');
      INSERT INTO auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
      VALUES (gen_random_uuid(), r.id, r.id::text, jsonb_build_object('sub',r.id::text,'email',r.email,'email_verified',true),'email',now(),now(),now());
    END IF;
  END LOOP;
END $$;

INSERT INTO public.user_roles(user_id,role,shop_id) VALUES
 ('a0000000-0000-0000-0000-000000000002','employee','30000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000003','employee','30000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000003','shop_admin','30000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000004','network_admin',NULL),
 ('a0000000-0000-0000-0000-000000000005','it_admin',NULL)
ON CONFLICT DO NOTHING;
INSERT INTO public.employees(user_id,shop_id,employee_number) VALUES
 ('a0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','DLA-001'),
 ('a0000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','DLA-002')
ON CONFLICT DO NOTHING;
INSERT INTO public.shop_admin_mandates(shop_id,user_id,origin)
SELECT '30000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','appointment'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_admin_mandates WHERE shop_id='30000000-0000-0000-0000-000000000001');

-- ---------- Catalogue client (étape 3) ----------
INSERT INTO public.products(id,category_id,name,slug,description) VALUES
 ('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001','Sac à main cuir','sac-a-main-cuir','Produit de démonstration'),
 ('50000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000002','Beurre de karité','beurre-de-karite','Produit de démonstration')
ON CONFLICT DO NOTHING;
INSERT INTO public.product_variants(id,product_id,sku,barcode,label,price_xaf) VALUES
 ('60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001','ROBE-L','2000000000035','Taille L',15000),
 ('60000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000003','SAC-NOIR','2000000000042','Noir',22000),
 ('60000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000004','KARITE-250','2000000000059','250 g',3500)
ON CONFLICT DO NOTHING;
INSERT INTO public.inventory(shop_id,variant_id,quantity,alert_threshold) VALUES
 ('30000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003',6,2),
 ('30000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004',3,1),
 ('30000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000004',5,1),
 ('30000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000005',30,5),
 ('30000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002',4,2)
ON CONFLICT DO NOTHING;
INSERT INTO public.product_images(id,product_id,url,position) VALUES
 ('70000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','/products/robe-pagne.jpg',0),
 ('70000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','/products/parfum-desty.jpg',0),
 ('70000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','/products/sac-cuir.jpg',0),
 ('70000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','/products/beurre-karite.jpg',0)
ON CONFLICT DO NOTHING;
