-- Verificar localização dos usuários em cada schema
SELECT 'public' as schema_name, COUNT(*) as user_count FROM public.users;
SELECT 'UMC' as schema_name, COUNT(*) as user_count FROM "UMC".users;
SELECT 'COMG' as schema_name, COUNT(*) as user_count FROM "COMG".users;

-- Detalhes do usuário rafael no schema public
SELECT 'public' as schema_name, username, email FROM public.users WHERE email = 'rafael@ascitech.com.br';

-- Detalhes do usuário rafael no schema UMC
SELECT 'UMC' as schema_name, username, email FROM "UMC".users WHERE email = 'rafael@ascitech.com.br';
