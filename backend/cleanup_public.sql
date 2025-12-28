-- Limpar tabelas do schema public
SET search_path TO public;

-- Verificar antes
SELECT 'Users before:' as info;
SELECT id, email FROM users;

SELECT 'Tenant memberships before:' as info;
SELECT * FROM tenant_memberships;

-- Limpar referências primeiro
DELETE FROM password_reset_tokens;
DELETE FROM invites;
DELETE FROM public_tenant_invites;
DELETE FROM users_groups;
DELETE FROM users_user_permissions;
DELETE FROM django_admin_log;

-- Limpar tenant_memberships
DELETE FROM tenant_memberships;

-- Deletar todos os usuários
DELETE FROM users;

-- Verificar depois
SELECT 'Users after:' as info;
SELECT id, email FROM users;

SELECT 'Tenant memberships after:' as info;
SELECT * FROM tenant_memberships;

SELECT 'Cleanup completed!' as result;
