import type { WorkOrder } from '@/types';
import { hexToRgba } from '@/shared/ui/statusBadgeUtils';

export interface WorkOrderSettings {
  statuses: Array<{ id: string; label: string; color: string }>;
  types: Array<{ id: string; label: string; color: string }>;
}

export interface PrintWorkOrderOptions {
  workOrder: WorkOrder;
  equipment?: any[];
  sectors?: any[];
  companies?: any[];
  settings?: WorkOrderSettings;
  costs?: {
    labor: number;
    parts: number;
    third_party: number;
    adjustment: number;
    total: number;
  };
}

export function generateWorkOrderPrintContent({ 
  workOrder, 
  equipment = [], 
  sectors = [], 
  companies = [],
  settings,
  costs
}: PrintWorkOrderOptions): string {
  // Buscar dados do equipamento
  const eq = equipment.find(e => e.id === workOrder.equipmentId);
  const sector = eq ? sectors.find(s => s.id === eq.sectorId) : null;
  const company = sector ? companies.find(c => c.id === sector.companyId) : null;

  // Mapear status para português e cores usando configurações
  const getStatusConfig = (status: string) => {
    const config = settings?.statuses.find(s => s.id === status);
    if (config) {
      return {
        label: config.label,
        bgColor: hexToRgba(config.color, 0.15),
        textColor: config.color,
        borderColor: hexToRgba(config.color, 0.3)
      };
    }
    // Fallback se não encontrar
    switch (status) {
      case 'OPEN': return { label: 'Aberta', bgColor: 'rgba(59, 130, 246, 0.15)', textColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' };
      case 'IN_PROGRESS': return { label: 'Em Execução', bgColor: 'rgba(245, 158, 11, 0.15)', textColor: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' };
      case 'COMPLETED': return { label: 'Concluída', bgColor: 'rgba(34, 197, 94, 0.15)', textColor: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' };
      default: return { label: status, bgColor: 'rgba(107, 114, 128, 0.15)', textColor: '#6b7280', borderColor: 'rgba(107, 114, 128, 0.3)' };
    }
  };

  const getTypeConfig = (type: string) => {
    const config = settings?.types.find(t => t.id === type);
    if (config) {
      return {
        label: config.label,
        bgColor: hexToRgba(config.color, 0.15),
        textColor: config.color,
        borderColor: hexToRgba(config.color, 0.3)
      };
    }
    // Fallback se não encontrar
    switch (type) {
      case 'PREVENTIVE': return { label: 'Preventiva', bgColor: 'rgba(59, 130, 246, 0.15)', textColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' };
      case 'CORRECTIVE': return { label: 'Corretiva', bgColor: 'rgba(239, 68, 68, 0.15)', textColor: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' };
      case 'REQUEST': return { label: 'Solicitação', bgColor: 'rgba(139, 92, 246, 0.15)', textColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' };
      default: return { label: type, bgColor: 'rgba(107, 114, 128, 0.15)', textColor: '#6b7280', borderColor: 'rgba(107, 114, 128, 0.3)' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'LOW': return { label: 'Baixa', bgColor: '#f1f5f9', textColor: '#475569', borderColor: '#cbd5e1' };
      case 'MEDIUM': return { label: 'Média', bgColor: '#dbeafe', textColor: '#1d4ed8', borderColor: '#93c5fd' };
      case 'HIGH': return { label: 'Alta', bgColor: '#ffedd5', textColor: '#ea580c', borderColor: '#fdba74' };
      case 'CRITICAL': return { label: 'Crítica', bgColor: '#fee2e2', textColor: '#dc2626', borderColor: '#fca5a5' };
      default: return { label: priority, bgColor: '#f3f4f6', textColor: '#6b7280', borderColor: '#d1d5db' };
    }
  };

  const statusConfig = getStatusConfig(workOrder.status);
  const typeConfig = getTypeConfig(workOrder.type);
  const priorityConfig = getPriorityConfig(workOrder.priority);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateExecutionTime = () => {
    if (!workOrder.completedAt || !workOrder.scheduledDate) return null;
    const days = Math.ceil(
      (new Date(workOrder.completedAt).getTime() - new Date(workOrder.scheduledDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'No mesmo dia';
    if (days === 1) return '1 dia';
    if (days < 0) return `${Math.abs(days)} dias antes`;
    return `${days} dias`;
  };

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ordem de Serviço ${workOrder.number}</title>
      <style>
        /* Reset e estilos base */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          color: #1f2937;
          background-color: #f0fdfa;
        }
        
        /* Container principal - estilo modal */
        .page-container {
          max-width: 210mm;
          margin: 0 auto;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        /* Cabeçalho estilo modal */
        .header-container {
          background: linear-gradient(to bottom, #f8fafc, transparent);
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .header-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .status-icon-container {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
        }
        
        .status-icon {
          width: 24px;
          height: 24px;
        }
        
        .header-text {
          display: flex;
          flex-direction: column;
        }
        
        .os-number {
          font-size: 18pt;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }
        
        .os-created {
          font-size: 9pt;
          color: #6b7280;
        }
        
        .badges-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 8pt;
          font-weight: 500;
          border: 1px solid;
        }
        
        /* Conteúdo principal */
        .content-container {
          padding: 16px 24px 24px;
        }
        
        /* Cards estilo modal */
        .card {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        
        .card-content {
          padding: 16px;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .card-header-icon {
          width: 16px;
          height: 16px;
          color: #0ea5e9;
        }
        
        .card-title {
          font-size: 10pt;
          font-weight: 500;
          color: #111827;
        }
        
        .card-badge {
          margin-left: auto;
          background-color: #f3f4f6;
          color: #6b7280;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 8pt;
          font-weight: 500;
        }
        
        /* Breadcrumb de localização */
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          font-size: 9pt;
          margin-bottom: 12px;
        }
        
        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6b7280;
        }
        
        .breadcrumb-item.active {
          color: #111827;
          font-weight: 500;
        }
        
        .breadcrumb-separator {
          color: #d1d5db;
          font-size: 10pt;
        }
        
        .breadcrumb-icon {
          width: 14px;
          height: 14px;
        }
        
        /* Equipamento destacado */
        .equipment-box {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 12px;
        }
        
        .equipment-tag {
          font-size: 10pt;
          font-weight: 500;
          color: #111827;
          margin-bottom: 2px;
        }
        
        .equipment-details {
          font-size: 8pt;
          color: #6b7280;
        }
        
        /* Grid de informações */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .info-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 8pt;
          color: #6b7280;
        }
        
        .info-label-icon {
          width: 12px;
          height: 12px;
        }
        
        .info-value {
          font-size: 10pt;
          font-weight: 500;
          color: #111827;
        }
        
        /* Descrição */
        .description-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        .description-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 8pt;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .description-text {
          font-size: 10pt;
          color: #374151;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        
        /* Materiais */
        .material-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        
        .material-item:last-child {
          margin-bottom: 0;
        }
        
        .material-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .material-icon-box {
          padding: 6px;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
        
        .material-icon {
          width: 14px;
          height: 14px;
          color: #6b7280;
        }
        
        .material-name {
          font-size: 10pt;
          font-weight: 500;
          color: #111827;
        }
        
        .material-quantity {
          font-size: 10pt;
        }
        
        .material-quantity-value {
          font-weight: 600;
          color: #059669;
        }
        
        .material-quantity-unit {
          color: #6b7280;
          margin-left: 4px;
        }
        
        /* Fotos */
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        
        .photo-item {
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
          background-color: #f3f4f6;
        }
        
        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Custos */
        .costs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .cost-item {
          padding: 12px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .cost-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 8pt;
          color: #6b7280;
          margin-bottom: 6px;
        }
        
        .cost-icon {
          width: 12px;
          height: 12px;
        }
        
        .cost-value {
          font-size: 10pt;
          font-weight: 600;
          color: #111827;
        }
        
        .cost-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background-color: rgba(14, 165, 233, 0.05);
          border: 1px solid rgba(14, 165, 233, 0.2);
          border-radius: 8px;
        }
        
        .cost-total-label {
          font-size: 10pt;
          font-weight: 500;
          color: #111827;
        }
        
        .cost-total-value {
          font-size: 14pt;
          font-weight: 700;
          color: #0ea5e9;
        }
        
        /* Rodapé */
        .footer-container {
          margin-top: 24px;
          padding: 16px 24px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }
        
        .footer-brand {
          font-size: 9pt;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        
        .footer-text {
          font-size: 8pt;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .footer-date {
          font-size: 8pt;
          color: #9ca3af;
          margin-top: 8px;
        }
        
        /* Assinaturas */
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          margin-top: 24px;
          padding-top: 24px;
        }
        
        .signature-block {
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 2px solid #1f2937;
          margin-bottom: 8px;
          height: 40px;
        }
        
        .signature-name {
          font-size: 10pt;
          font-weight: 600;
          text-transform: uppercase;
          color: #111827;
          margin-bottom: 2px;
        }
        
        .signature-title {
          font-size: 8pt;
          color: #6b7280;
        }
        
        /* Otimizações para impressão */
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            background-color: white;
            padding: 0;
            margin: 0;
          }
          
          .page-container {
            margin: 0;
            max-width: 100%;
            box-shadow: none;
            border-radius: 0;
          }
          
          .card,
          .equipment-box,
          .material-item,
          .cost-item,
          .cost-total,
          .badge,
          .status-icon-container {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .card {
            page-break-inside: avoid;
          }
          
          .photos-grid {
            page-break-inside: avoid;
          }
          
          .signatures-grid {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- Cabeçalho estilo modal -->
        <div class="header-container">
          <div class="header-main">
            <div class="header-left">
              <div class="status-icon-container" style="background-color: ${statusConfig.bgColor}; border-color: ${statusConfig.borderColor};">
                <svg class="status-icon" style="color: ${statusConfig.textColor};" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  ${workOrder.status === 'COMPLETED' 
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
                    : workOrder.status === 'IN_PROGRESS'
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
                    : '<circle cx="12" cy="12" r="10" stroke-width="2" />'
                  }
                </svg>
              </div>
              <div class="header-text">
                <div class="os-number">OS #${workOrder.number}</div>
                <div class="os-created">Criada em ${formatDateTime(workOrder.createdAt)}</div>
              </div>
            </div>
            
            <div class="badges-container">
              <span class="badge" style="background-color: ${statusConfig.bgColor}; color: ${statusConfig.textColor}; border-color: ${statusConfig.borderColor};">
                ${statusConfig.label}
              </span>
              <span class="badge" style="background-color: ${typeConfig.bgColor}; color: ${typeConfig.textColor}; border-color: ${typeConfig.borderColor};">
                ${typeConfig.label}
              </span>
              <span class="badge" style="background-color: ${priorityConfig.bgColor}; color: ${priorityConfig.textColor}; border-color: ${priorityConfig.borderColor};">
                ${priorityConfig.label}
              </span>
            </div>
          </div>
        </div>
        
        <div class="content-container">
          <!-- Card: Localização e Equipamento -->
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="card-title">Localização e Equipamento</span>
              </div>
              
              <!-- Breadcrumb -->
              <div class="breadcrumb">
                <span class="breadcrumb-item">
                  <svg class="breadcrumb-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  ${company?.name || '-'}
                </span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">
                  <svg class="breadcrumb-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  ${sector?.name || '-'}
                </span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item active">
                  <svg class="breadcrumb-icon" style="color: #0ea5e9;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  ${eq?.tag || '-'}
                </span>
              </div>
              
              ${eq ? `
              <div class="equipment-box">
                <div class="equipment-tag">${eq.tag}</div>
                <div class="equipment-details">${eq.model || ''}${eq.brand ? ` • ${eq.brand}` : ''}${eq.manufacturer ? ` • ${eq.manufacturer}` : ''}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Card: Informações Gerais -->
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span class="card-title">Informações Gerais</span>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">
                    <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Data Agendada
                  </div>
                  <div class="info-value">${formatDate(workOrder.scheduledDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">
                    <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Técnico Responsável
                  </div>
                  <div class="info-value">${workOrder.assignedToName || 'Não atribuído'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">
                    <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Criada em
                  </div>
                  <div class="info-value">${formatDateTime(workOrder.createdAt)}</div>
                </div>
              </div>
              
              ${workOrder.description ? `
              <div class="description-section">
                <div class="description-label">
                  <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descrição
                </div>
                <div class="description-text">${workOrder.description}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Card: Execução (se houver dados) -->
          ${(workOrder.startedAt || workOrder.completedAt || workOrder.executionDescription) ? `
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="card-title">Execução</span>
              </div>
              
              <div class="info-grid">
                ${workOrder.completedAt ? `
                <div class="info-item">
                  <div class="info-label">
                    <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Concluída em
                  </div>
                  <div class="info-value">${formatDateTime(workOrder.completedAt)}</div>
                </div>
                ` : ''}
                ${calculateExecutionTime() ? `
                <div class="info-item">
                  <div class="info-label">
                    <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tempo Total
                  </div>
                  <div class="info-value">${calculateExecutionTime()}</div>
                </div>
                ` : ''}
              </div>
              
              ${workOrder.executionDescription ? `
              <div class="description-section">
                <div class="description-label">
                  <svg class="info-label-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descrição da Execução
                </div>
                <div class="description-text">${workOrder.executionDescription}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <!-- Card: Materiais Utilizados -->
          ${workOrder.stockItems && workOrder.stockItems.length > 0 ? `
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span class="card-title">Materiais Utilizados</span>
                <span class="card-badge">${workOrder.stockItems.length} ${workOrder.stockItems.length === 1 ? 'item' : 'itens'}</span>
              </div>
              
              <div>
                ${workOrder.stockItems.map(item => `
                <div class="material-item">
                  <div class="material-left">
                    <div class="material-icon-box">
                      <svg class="material-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <span class="material-name">${item.itemName || item.stockItem?.description || `Item ${item.stockItemId}`}</span>
                  </div>
                  <div class="material-quantity">
                    <span class="material-quantity-value">${item.quantity}</span>
                    <span class="material-quantity-unit">${item.unit || item.stockItem?.unit || 'UN'}</span>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Card: Fotos da Execução -->
          ${workOrder.photos && workOrder.photos.length > 0 ? `
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="card-title">Fotos da Execução</span>
                <span class="card-badge">${workOrder.photos.length} ${workOrder.photos.length === 1 ? 'foto' : 'fotos'}</span>
              </div>
              
              <div class="photos-grid">
                ${workOrder.photos.map(photo => `
                <div class="photo-item">
                  <img src="${photo.url}" alt="${photo.name || 'Foto'}" onerror="this.parentElement.style.display='none'" />
                </div>
                `).join('')}
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Card: Custos -->
          ${costs ? `
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="card-title">Custos</span>
              </div>
              
              <div class="costs-grid">
                <div class="cost-item">
                  <div class="cost-label">
                    <svg class="cost-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mão de Obra
                  </div>
                  <div class="cost-value">${formatCurrency(costs.labor)}</div>
                </div>
                <div class="cost-item">
                  <div class="cost-label">
                    <svg class="cost-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Peças
                  </div>
                  <div class="cost-value">${formatCurrency(costs.parts)}</div>
                </div>
                <div class="cost-item">
                  <div class="cost-label">
                    <svg class="cost-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Terceiros
                  </div>
                  <div class="cost-value">${formatCurrency(costs.third_party)}</div>
                </div>
                <div class="cost-item">
                  <div class="cost-label">
                    <svg class="cost-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Ajustes
                  </div>
                  <div class="cost-value">${formatCurrency(costs.adjustment)}</div>
                </div>
              </div>
              
              <div class="cost-total">
                <span class="cost-total-label">Total Geral</span>
                <span class="cost-total-value">${formatCurrency(costs.total)}</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <!-- Assinaturas -->
          <div class="card">
            <div class="card-content">
              <div class="card-header">
                <svg class="card-header-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span class="card-title">Assinaturas</span>
              </div>
              
              <div class="signatures-grid">
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div class="signature-name">Técnico Responsável</div>
                  ${workOrder.assignedToName ? `<div class="signature-title">${workOrder.assignedToName}</div>` : ''}
                </div>
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div class="signature-name">Cliente/Responsável</div>
                  <div class="signature-title">Nome Completo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Rodapé -->
        <div class="footer-container">
          <div class="footer-brand">TrakNor CMMS</div>
          <div class="footer-text">
            Documento gerado eletronicamente. Este documento é parte integrante do sistema de gestão de manutenção.
          </div>
          <div class="footer-date">
            Emitido em: ${new Date().toLocaleString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function printWorkOrder(options: PrintWorkOrderOptions): void {
  const documentHTML = generateWorkOrderPrintContent(options);
  
  // Criar uma nova guia com interface melhorada
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Bloqueador de pop-up detectado. Permita pop-ups para imprimir.');
    return;
  }
  
  // Criar conteúdo com barra de ferramentas
  const enhancedContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ordem de Serviço ${options.workOrder.number} - TrakNor CMMS</title>
      <style>
        /* Reset */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f0fdfa;
        }
        
        /* Barra de ferramentas */
        .toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background-color: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          align-items: center;
          padding: 0 20px;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .toolbar-left {
          display: flex;
          align-items: center;
          flex: 1;
        }
        
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .toolbar-title {
          font-weight: 600;
          color: #334155;
          margin-right: 20px;
          font-size: 16px;
        }
        
        .page-indicator {
          margin: 0 20px;
          font-size: 14px;
          color: #64748b;
          background-color: #e2e8f0;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .zoom-controls {
          display: flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          background-color: white;
        }
        
        .zoom-button {
          background-color: transparent;
          border: none;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          font-size: 18px;
          font-weight: bold;
          transition: background-color 0.2s;
        }
        
        .zoom-button:hover {
          background-color: #f1f5f9;
        }
        
        .zoom-text {
          padding: 0 12px;
          font-size: 14px;
          color: #475569;
          font-weight: 500;
          min-width: 50px;
          text-align: center;
        }
        
        .action-button {
          background-color: #0284c7;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .action-button:hover {
          background-color: #0369a1;
        }
        
        .action-button.secondary {
          background-color: #64748b;
        }
        
        .action-button.secondary:hover {
          background-color: #475569;
        }
        
        .action-button svg {
          width: 16px;
          height: 16px;
          margin-right: 6px;
        }
        
        /* Espaço para a barra de ferramentas */
        .content-wrapper {
          margin-top: 80px;
          padding: 20px;
          transform-origin: top center;
          transition: transform 0.2s ease;
        }
        
        @media print {
          .toolbar {
            display: none !important;
          }
          
          .content-wrapper {
            margin-top: 0 !important;
            padding: 0 !important;
            transform: none !important;
          }
          
          body {
            background-color: white !important;
          }
          
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      </style>
    </head>
    <body>
      <!-- Barra de ferramentas -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="toolbar-title">Ordem de Serviço #${options.workOrder.number}</div>
          <div class="page-indicator">1 / 1</div>
          
          <div class="zoom-controls">
            <button class="zoom-button" title="Diminuir zoom" onclick="changeZoom(-10)">−</button>
            <div class="zoom-text" id="zoom-display">100%</div>
            <button class="zoom-button" title="Aumentar zoom" onclick="changeZoom(10)">+</button>
          </div>
        </div>
        
        <div class="toolbar-right">
          <button class="action-button secondary" onclick="window.close()" title="Fechar janela">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fechar
          </button>
          
          <button class="action-button" onclick="downloadPDF()" title="Baixar como PDF">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
          
          <button class="action-button" onclick="window.print()" title="Imprimir documento">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
        </div>
      </div>
      
      <!-- Conteúdo do documento -->
      <div class="content-wrapper" id="document-content">
        ${documentHTML}
      </div>
      
      <script>
        let currentZoom = 1.0;
        
        function changeZoom(delta) {
          const content = document.getElementById('document-content');
          const zoomDisplay = document.getElementById('zoom-display');
          
          currentZoom += (delta / 100);
          currentZoom = Math.max(0.5, Math.min(2.0, currentZoom));
          
          content.style.transform = \`scale(\${currentZoom})\`;
          zoomDisplay.textContent = \`\${Math.round(currentZoom * 100)}%\`;
        }
        
        function downloadPDF() {
          document.title = 'OS_${options.workOrder.number}_' + new Date().toISOString().split('T')[0];
          window.print();
        }
        
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
              case 'p':
                e.preventDefault();
                window.print();
                break;
              case '=':
              case '+':
                e.preventDefault();
                changeZoom(10);
                break;
              case '-':
                e.preventDefault();
                changeZoom(-10);
                break;
              case '0':
                e.preventDefault();
                currentZoom = 1.0;
                document.getElementById('document-content').style.transform = 'scale(1)';
                document.getElementById('zoom-display').textContent = '100%';
                break;
            }
          }
        });
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(enhancedContent);
  printWindow.document.close();
  printWindow.focus();
}
