-- Verificar usuários restantes nos schemas
SELECT 'UMC Schema - Users:' as info;
SET search_path TO "UMC";
SELECT id, email FROM users;

SELECT 'COMG Schema - Users:' as info;
SET search_path TO "COMG";
SELECT id, email FROM users;

SELECT 'Public Schema - Users:' as info;
SET search_path TO public;
SELECT id, email FROM users;
