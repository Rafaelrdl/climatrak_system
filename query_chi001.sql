-- Buscar dados do ativo CHI-001
SET search_path TO "COMG";

-- 1. Dados do ativo
SELECT id, tag, name, installation_date 
FROM assets 
WHERE tag = 'CHI-001';

-- 2. Work Orders do ativo CHI-001 (asset_id = 1)
SELECT wo.number, wo.type, wo.status, wo.actual_hours, wo.created_at, wo.started_at, wo.completed_at
FROM cmms_workorder wo
WHERE wo.asset_id = 1
ORDER BY wo.created_at;

-- 3. Resumo: Corretivas e Emergências concluídas
SELECT 
    type,
    status,
    COUNT(*) as total,
    SUM(COALESCE(actual_hours, 0)) as total_hours
FROM cmms_workorder wo
WHERE wo.asset_id = 1
AND type IN ('CORRECTIVE', 'EMERGENCY')
AND status = 'COMPLETED'
GROUP BY type, status;

-- 4. Total de todas as WOs
SELECT 
    type,
    status,
    COUNT(*) as total
FROM cmms_workorder wo
WHERE wo.asset_id = 1
GROUP BY type, status
ORDER BY type, status;
