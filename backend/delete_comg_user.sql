-- Deletar usuário do COMG
SET search_path TO "COMG";

-- Verificar antes
SELECT 'Before:' as info;
SELECT id, email FROM users WHERE email = 'rafaelrdlessa@gmail.com';

-- Limpar referências primeiro
DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'rafaelrdlessa@gmail.com');
UPDATE invites SET accepted_by_id = NULL WHERE accepted_by_id IN (SELECT id FROM users WHERE email = 'rafaelrdlessa@gmail.com');
DELETE FROM tenant_memberships WHERE user_id IN (SELECT id FROM users WHERE email = 'rafaelrdlessa@gmail.com');
DELETE FROM users_groups WHERE user_id IN (SELECT id FROM users WHERE email = 'rafaelrdlessa@gmail.com');
DELETE FROM users_user_permissions WHERE user_id IN (SELECT id FROM users WHERE email = 'rafaelrdlessa@gmail.com');

-- Deletar usuário
DELETE FROM users WHERE email = 'rafaelrdlessa@gmail.com';

-- Verificar depois
SELECT 'After - remaining users:' as info;
SELECT id, email FROM users;
