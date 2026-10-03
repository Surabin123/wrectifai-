-- Reattach the 12 demo garages to the matching active garage login accounts.
-- Keep garage IDs and all garage-owned rows intact; only correct owner_user_id.
WITH owner_repairs (garage_id, previous_owner_id, login_user_id) AS (
  VALUES
    ('00000000-0000-0000-0000-000000000011'::uuid, '205cd007-da60-4c36-a94b-e1c4ff3a5bbe'::uuid, 'b6796cdc-8610-4e8b-9c14-3b9eaa8b3b3e'::uuid),
    ('00000000-0000-0000-0000-000000000012'::uuid, '3615a219-92fd-41ce-9f62-5f366802dfa2'::uuid, 'e576ac53-6a6f-46bf-b834-550971d4eba5'::uuid),
    ('00000000-0000-0000-0000-000000000013'::uuid, '13b60205-c220-4248-b849-30fa3e361927'::uuid, '77444863-d55b-4a0b-a1b9-e1746736c729'::uuid),
    ('00000000-0000-0000-0000-000000000014'::uuid, '70d01ec5-6ad6-4c69-88d6-c74e95f9612e'::uuid, '7e729368-f8bf-4fa4-9bbb-a1214be92133'::uuid),
    ('00000000-0000-0000-0000-000000000015'::uuid, 'c8dea4a5-e24c-45aa-8e4e-d103253e556d'::uuid, 'ca8c6c48-2e44-4480-b43e-95abd24349b5'::uuid),
    ('00000000-0000-0000-0000-000000000016'::uuid, '826c2811-8250-4fdb-afe1-0e5f00567fdf'::uuid, '908d6488-358d-4702-84cc-c725561b2527'::uuid),
    ('00000000-0000-0000-0000-000000000017'::uuid, '8a987d79-0899-48e3-8b72-c8edafa2895f'::uuid, '321fc0dc-673b-42de-9e06-376e55940f17'::uuid),
    ('00000000-0000-0000-0000-000000000018'::uuid, '2e8f87b8-dd26-4c32-ba90-cd285789a7fa'::uuid, 'cfc40c51-5dbe-4efb-9e33-bb9823c4f06c'::uuid),
    ('00000000-0000-0000-0000-000000000019'::uuid, '9172fcc5-43ba-4f4b-b102-f5d287b4dd57'::uuid, '0cdeaff2-6ead-4243-9c82-df957759e3bf'::uuid),
    ('00000000-0000-0000-0000-000000000020'::uuid, 'b1c0ee20-5a5f-41ed-b9f4-745b64c6d493'::uuid, '5134e9af-28c9-4341-915f-310e32e884c5'::uuid),
    ('00000000-0000-0000-0000-000000000021'::uuid, '8413371c-2d14-4b33-a3c3-88825575a165'::uuid, '483e5705-9a68-4c9e-951b-4e7fd21c5d9d'::uuid),
    ('00000000-0000-0000-0000-000000000022'::uuid, '143cf56a-44f6-4cf4-a94b-bfbc823f17b4'::uuid, 'ed279b83-944d-4648-bbfc-04a7b30d727b'::uuid)
)
UPDATE garages AS g
SET owner_user_id = r.login_user_id
FROM owner_repairs AS r
JOIN users AS login_user ON login_user.id = r.login_user_id
WHERE g.id = r.garage_id
  AND g.owner_user_id = r.previous_owner_id
  AND lower(g.name) = lower(login_user.name)
  AND EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles role ON role.id = ur.role_id
    WHERE ur.user_id = login_user.id
      AND role.code = 'garage'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM garages existing
    WHERE existing.owner_user_id = login_user.id
      AND COALESCE(existing.approval_status, '') <> 'deleted'
  );
