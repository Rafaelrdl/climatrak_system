-- Limpar referências no schema public 
SET search_path TO public;

-- Listar usuários que serão deletados
SELECT 'Public Schema - Users to delete:' as info;
SELECT id, email FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br');

-- Deletar password_reset_tokens
DELETE FROM password_reset_tokens WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Remover referências em invites (public)
UPDATE invites SET accepted_by_id = NULL WHERE accepted_by_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Deletar tenant_memberships (public)
DELETE FROM tenant_memberships WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Deletar public_tenant_memberships 
DELETE FROM public_tenant_memberships WHERE identifier_hash IN (
    encode(sha256(convert_to(lower('rafaelrdlessa@gmail.com'), 'UTF8')), 'hex'),
    encode(sha256(convert_to(lower('rafael@ascitech.com.br'), 'UTF8')), 'hex')
);

-- Deletar public_tenant_user_index
DELETE FROM public_tenant_user_index WHERE identifier_hash IN (
    encode(sha256(convert_to(lower('rafaelrdlessa@gmail.com'), 'UTF8')), 'hex'),
    encode(sha256(convert_to(lower('rafael@ascitech.com.br'), 'UTF8')), 'hex')
);

-- Limpar users_groups
DELETE FROM users_groups WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Limpar users_user_permissions
DELETE FROM users_user_permissions WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Limpar django_admin_log
DELETE FROM django_admin_log WHERE user_id IN (
    SELECT id FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br')
);

-- Deletar usuários do public
DELETE FROM users WHERE email IN ('rafaelrdlessa@gmail.com', 'rafael@ascitech.com.br');

-- Verificar se deletou
SELECT 'Remaining users in public:' as info;
SELECT id, email FROM users;

SELECT 'Public schema cleanup completed!' as result;
