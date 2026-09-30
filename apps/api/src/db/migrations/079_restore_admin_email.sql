-- Keep the bootstrap administrator's profile email visible when an older
-- database was seeded without the email column populated.
UPDATE users
SET email = 'admin@wrectifai.com'
WHERE mobile_number = '0000000000'
  AND (email IS NULL OR BTRIM(email) = '')
  AND EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = users.id AND r.code = 'admin'
  );
