import type { WorkOrder } from '@/types';

export interface PrintWorkOrderOptions {
  workOrder: WorkOrder;
  equipment?: any[];
  sectors?: any[];
  companies?: any[];
}

export function generateWorkOrderPrintContent({ 
  workOrder, 
  equipment = [], 
  sectors = [], 
  companies = [] 
}: PrintWorkOrderOptions): string {
  // Buscar dados do equipamento
  const eq = equipment.find(e => e.id === workOrder.equipmentId);
  const sector = eq ? sectors.find(s => s.id === eq.sectorId) : null;
  const company = sector ? companies.find(c => c.id === sector.companyId) : null;

  // Mapear status para português
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberta';
      case 'IN_PROGRESS': return 'Em Progresso';
      case 'COMPLETED': return 'Concluída';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PREVENTIVE': return 'Preventiva';
      case 'CORRECTIVE': return 'Corretiva';
      case 'REQUEST': return 'Solicitação';
      default: return type;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baixa';
      case 'MEDIUM': return 'Média';
      case 'HIGH': return 'Alta';
      case 'CRITICAL': return 'Crítica';
      default: return priority;
    }
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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #2d3748;
          background-color: white;
        }
        
        /* Container principal */
        .page-container {
          max-width: 210mm;
          margin: 0 auto;
          background-color: white;
        }
        
        /* Cabeçalho melhorado */
        .header-container {
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
          padding: 0;
          margin-bottom: 30px;
        }
        
        .header-content {
          padding: 30px 35px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .header-left {
          flex: 1;
        }
        
        .logo-row {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .logo-circle {
          width: 55px;
          height: 55px;
          background-color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 20px;
          color: #0369a1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .company-info {
          color: white;
        }
        
        .company-name {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 2px;
        }
        
        .company-tagline {
          font-size: 13px;
          opacity: 0.95;
          letter-spacing: 0.3px;
        }
        
        .header-right {
          text-align: right;
          color: white;
        }
        
        .os-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        
        .os-number {
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -1px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header-meta {
          background-color: rgba(255,255,255,0.15);
          padding: 12px 35px;
          border-top: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .meta-label {
          opacity: 0.9;
        }
        
        .meta-value {
          font-weight: 600;
        }
        
        /* Conteúdo principal */
        .content-container {
          padding: 0 35px 35px;
        }
        
        /* Seções aprimoradas */
        .section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }
        
        .section-header {
          background: linear-gradient(to right, #f7fafc, transparent);
          border-left: 4px solid #0369a1;
          padding: 10px 15px;
          margin-bottom: 20px;
        }
        
        .section-number {
          display: inline-block;
          background-color: #0369a1;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          text-align: center;
          line-height: 24px;
          font-size: 12px;
          font-weight: 700;
          margin-right: 10px;
        }
        
        .section-title {
          display: inline;
          font-size: 14pt;
          font-weight: 600;
          color: #1a202c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Grid de informações aprimorado */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px 25px;
          background-color: #fafbfc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .info-label {
          font-size: 10pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #4a5568;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 11pt;
          font-weight: 400;
          color: #1a202c;
          line-height: 1.5;
        }
        
        /* Caixas de texto aprimoradas */
        .text-box {
          background-color: #ffffff;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          padding: 15px;
          min-height: 80px;
          margin-top: 10px;
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.6;
          color: #2d3748;
        }
        

        
        /* Tabelas modernas */
        .data-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .data-table th,
        .data-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .data-table th {
          background-color: #f7fafc;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10pt;
          color: #4a5568;
          letter-spacing: 0.5px;
        }
        
        .data-table td {
          font-size: 10pt;
          color: #2d3748;
        }
        
        .data-table tbody tr:hover {
          background-color: #f7fafc;
        }
        
        .data-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .data-table .task-number {
          width: 50px;
          text-align: center;
          font-weight: 600;
          color: #0369a1;
        }
        
        .data-table .task-status {
          width: 100px;
          text-align: center;
          font-weight: 600;
        }
        
        .status-complete {
          color: #059669;
        }
        
        .status-pending {
          color: #d97706;
        }
        
        /* Galeria de fotos moderna */
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 20px;
        }
        
        .photo-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          page-break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .photo-card img {
          max-width: 100%;
          max-height: 150px;
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          border-radius: 4px;
        }
        
        .photo-caption {
          margin-top: 8px;
          font-size: 9pt;
          color: #718096;
          font-weight: 500;
        }
        
        /* Assinaturas modernas */
        .signatures-section {
          margin-top: 60px;
          page-break-inside: avoid;
        }
        
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 40px;
        }
        
        .signature-block {
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 2px solid #2d3748;
          margin-bottom: 10px;
          height: 50px;
        }
        
        .signature-name {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #1a202c;
          margin-bottom: 4px;
        }
        
        .signature-title {
          font-size: 9pt;
          color: #718096;
          font-weight: 500;
        }
        
        .signature-cpf {
          font-size: 9pt;
          color: #4a5568;
          margin-top: 4px;
        }
        
        /* Rodapé corporativo */
        .footer-container {
          margin-top: 50px;
          padding: 25px 35px;
          background-color: #f7fafc;
          border-top: 3px solid #0369a1;
          text-align: center;
        }
        
        .footer-legal {
          font-size: 9pt;
          color: #4a5568;
          font-style: italic;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        
        .footer-date {
          font-size: 8pt;
          color: #718096;
          margin-top: 10px;
        }
        
        /* Otimizações para impressão */
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          
          body {
            padding: 0;
            margin: 0;
          }
          
          .page-container {
            margin: 0;
            max-width: 100%;
            box-shadow: none;
          }
          
          .header-container,
          .section-header,
          .section-number,
          .info-grid {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .section,
          .photo-card,
          .signature-block {
            page-break-inside: avoid;
          }
          
          .photos-grid {
            page-break-before: avoid;
          }
          
          .photos-grid {
            page-break-inside: avoid;
          }
          
          .photo-container {
            page-break-inside: avoid;
          }
          
          .signatures-section {
            page-break-inside: avoid;
          }
          
          .checklist-table,
          .materials-table {
            page-break-inside: auto;
          }
          
          .checklist-table tr,
          .materials-table tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- Cabeçalho Moderno -->
        <div class="header-container">
          <div class="header-content">
            <div class="logo-circle">TN</div>
            <div class="header-text">
              <div class="company-name">TrakNor CMMS</div>
              <div class="document-type">ORDEM DE SERVIÇO</div>
            </div>
            <div class="os-number">#${workOrder.number}</div>
          </div>
          <div class="header-meta">
            <span class="meta-item">Emitido em: ${new Date().toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}</span>
            <span class="meta-separator">•</span>
            <span class="meta-item">${new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
        
        <div class="content-container">
          <!-- Seção 1: Informações Gerais -->
          <div class="section">
            <div class="section-header">
              <span class="section-number">1</span>
              <h2 class="section-title">Informações Gerais</h2>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Tipo de Serviço</span>
                <span class="info-value">${getTypeLabel(workOrder.type)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">${getStatusLabel(workOrder.status)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Prioridade</span>
                <span class="info-value">${getPriorityLabel(workOrder.priority)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Data Programada</span>
                <span class="info-value">${new Date(workOrder.scheduledDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Técnico Responsável</span>
                <span class="info-value">${workOrder.assignedToName || workOrder.assignedTo || 'Não atribuído'}</span>
              </div>
              ${workOrder.completedAt ? `
              <div class="info-item">
                <span class="info-label">Data de Conclusão</span>
                <span class="info-value">${new Date(workOrder.completedAt).toLocaleDateString('pt-BR')}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
          
          <!-- Seção 2: Equipamento e Localização -->
          <div class="section">
            <div class="section-header">
              <span class="section-number">2</span>
              <h2 class="section-title">Equipamento e Localização</h2>
            </div>
            ${eq ? `
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Tag do Equipamento</span>
                <span class="info-value">${eq.tag}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipo</span>
                <span class="info-value">${eq.type}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Marca</span>
                <span class="info-value">${eq.brand}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Modelo</span>
                <span class="info-value">${eq.model}</span>
              </div>
              ${eq.capacity ? `
              <div class="info-item">
                <span class="info-label">Capacidade</span>
                <span class="info-value">${eq.capacity.toLocaleString('pt-BR')} BTUs</span>
              </div>
              ` : ''}
              ${company ? `
              <div class="info-item">
                <span class="info-label">Empresa</span>
                <span class="info-value">${company.name}</span>
              </div>
              ` : ''}
              ${sector ? `
              <div class="info-item">
                <span class="info-label">Setor</span>
                <span class="info-value">${sector.name}</span>
              </div>
              ` : ''}
            </div>
            ` : `
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Equipamento</span>
                <span class="info-value">Não especificado</span>
              </div>
            </div>
            `}
          </div>
          
          <!-- Seção 3: Descrição do Serviço -->
          <div class="section">
            <div class="section-header">
              <span class="section-number">3</span>
              <h2 class="section-title">Descrição do Serviço</h2>
            </div>
            <div class="text-box">${workOrder.description || 'Não informado'}</div>
          </div>
          
          <!-- Seção 4: Checklist (Apenas para Preventivas) -->
          ${workOrder.type === 'PREVENTIVE' && workOrder.checklistResponses && workOrder.checklistResponses.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <span class="section-number">4</span>
              <h2 class="section-title">Checklist de Manutenção Preventiva</h2>
            </div>
            <table class="data-table">
            <thead>
              <tr>
                <th class="task-number">Nº</th>
                <th>Tarefa</th>
                <th class="task-status">Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${workOrder.checklistResponses.map((item, index) => `
              <tr>
                <td class="task-number">${index + 1}</td>
                <td>${item.taskName}</td>
                <td class="task-status ${item.completed ? 'status-complete' : 'status-pending'}">
                  ${item.completed ? 'CONCLUÍDO' : 'PENDENTE'}
                </td>
                <td>${item.observations || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
          
          <!-- Seção 5: Materiais Utilizados -->
          ${workOrder.stockItems && workOrder.stockItems.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <span class="section-number">${workOrder.type === 'PREVENTIVE' && workOrder.checklistResponses?.length ? '5' : '4'}</span>
              <h2 class="section-title">Materiais Utilizados</h2>
            </div>
            <table class="data-table">
            <thead>
              <tr>
                <th>Descrição do Item</th>
                <th>Quantidade</th>
                <th>Unidade</th>
                <th>Código SKU</th>
              </tr>
            </thead>
            <tbody>
              ${workOrder.stockItems.map(item => `
              <tr>
                <td>${item.stockItem?.description || `Item ${item.stockItemId}`}</td>
                <td>${item.quantity}</td>
                <td>${item.stockItem?.unit || 'UN'}</td>
                <td>${item.stockItemId || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
          
          <!-- Seção 6: Detalhes da Execução -->
          <div class="section">
            <div class="section-header">
              <span class="section-number">${
                workOrder.type === 'PREVENTIVE' && workOrder.checklistResponses?.length ? 
                  (workOrder.stockItems?.length ? '6' : '5') : 
                  (workOrder.stockItems?.length ? '5' : '4')
              }</span>
              <h2 class="section-title">Detalhes da Execução</h2>
            </div>
            <div class="text-box">${workOrder.executionDescription || ' '}</div>
          </div>
          
          <!-- Seção 7: Evidências Fotográficas -->
          ${workOrder.photos && workOrder.photos.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <span class="section-number">${
                workOrder.type === 'PREVENTIVE' && workOrder.checklistResponses?.length ? 
                  (workOrder.stockItems?.length ? '7' : '6') : 
                  (workOrder.stockItems?.length ? '6' : '5')
              }</span>
              <h2 class="section-title">Evidências Fotográficas</h2>
            </div>
            <div class="photos-grid">
              ${workOrder.photos.map((photo, index) => `
              <div class="photo-card">
                <img src="${photo.url}" alt="Evidência ${index + 1}" onerror="this.style.display='none'"/>
                <div class="photo-caption">Evidência ${index + 1}${photo.name ? `: ${photo.name}` : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
          
          <!-- Seção de Assinaturas -->
          <div class="section signatures-section">
            <div class="section-header">
              <span class="section-number">${
                workOrder.type === 'PREVENTIVE' && workOrder.checklistResponses?.length ? 
                  (workOrder.stockItems?.length ? (workOrder.photos?.length ? '8' : '7') : (workOrder.photos?.length ? '7' : '6')) : 
                  (workOrder.stockItems?.length ? (workOrder.photos?.length ? '7' : '6') : (workOrder.photos?.length ? '6' : '5'))
              }</span>
              <h2 class="section-title">Assinaturas e Aprovações</h2>
            </div>
            <div class="signature-grid">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Técnico Responsável</div>
                ${(workOrder.assignedToName || workOrder.assignedTo) ? `<div class="signature-title">${workOrder.assignedToName || workOrder.assignedTo}</div>` : ''}
                <div class="signature-cpf">CPF: ___ . ___ . ___ - __</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Cliente/Responsável</div>
                <div class="signature-title">Nome Completo</div>
                <div class="signature-cpf">CPF: ___ . ___ . ___ - __</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Rodapé Corporativo -->
        <div class="footer-container">
          <div class="footer-legal">
            <strong>Documento gerado eletronicamente por TrakNor CMMS</strong>
          </div>
          <div class="footer-legal">
            Este documento é parte integrante do sistema de gestão de manutenção e deve ser 
            arquivado conforme os procedimentos da empresa. A assinatura acima confirma a 
            execução dos serviços descritos nesta ordem.
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

// Função auxiliar para extrair apenas os estilos CSS do documento
function getBaseStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      background-color: #f8fafc;
    }
    
    .document-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo-section {
      flex: 1;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .document-title {
      font-size: 18px;
      color: #6b7280;
    }
    
    .wo-number {
      text-align: right;
      font-size: 28px;
      font-weight: bold;
      color: #059669;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .info-item {
      margin-bottom: 12px;
    }
    
    .info-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .info-value {
      color: #000000;
    }
    
    .description-box, .execution-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      min-height: 80px;
      white-space: pre-wrap;
    }
    

    
    .materials-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    .materials-table th,
    .materials-table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    
    .materials-table th {
      background-color: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    
    .materials-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .signatures {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
    }
    
    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      margin-top: 40px;
    }
    
    .signature-field {
      text-align: center;
    }
    
    .signature-line {
      border-bottom: 1px solid #374151;
      height: 1px;
      margin-bottom: 60px;
    }
    
    .signature-label {
      font-weight: 600;
      color: #374151;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
  `;
}

export function printWorkOrder(options: PrintWorkOrderOptions): void {
  const baseStyles = getBaseStyles();
  const documentHTML = generateWorkOrderPrintContent(options);
  
  // Extrair apenas o conteúdo do body do documento original
  const bodyMatch = documentHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const documentBody = bodyMatch ? bodyMatch[1] : documentHTML;
  
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
        ${baseStyles}
        
        /* Estilos para a barra de ferramentas */
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
          
          .document-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          
          @page {
            margin: 15mm;
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
        <div class="document-container">
          ${documentBody}
        </div>
      </div>
      
      <script>
        let currentZoom = 1.0;
        
        // Função para controlar o zoom do documento
        function changeZoom(delta) {
          const content = document.getElementById('document-content');
          const zoomDisplay = document.getElementById('zoom-display');
          
          // Calcular novo zoom
          currentZoom += (delta / 100);
          currentZoom = Math.max(0.5, Math.min(2.0, currentZoom)); // Limitar entre 50% e 200%
          
          // Aplicar novo zoom
          content.style.transform = \`scale(\${currentZoom})\`;
          
          // Atualizar texto de zoom
          zoomDisplay.textContent = \`\${Math.round(currentZoom * 100)}%\`;
        }
        
        // Função para download como PDF
        function downloadPDF() {
          // Configurar título do arquivo
          document.title = 'OS_${options.workOrder.number}_' + new Date().toISOString().split('T')[0];
          
          // Abrir diálogo de impressão (usuário pode escolher "Salvar como PDF")
          window.print();
        }
        
        // Atalhos de teclado
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
        
        // Keyboard shortcuts are available but console messages removed
      </script>
    </body>
    </html>
  `;
  
  // Escrever o conteúdo na nova guia
  printWindow.document.write(enhancedContent);
  printWindow.document.close();
  
  // Focar na nova janela
  printWindow.focus();
}