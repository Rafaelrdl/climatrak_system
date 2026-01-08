import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Wrench, 
  ClipboardList, 
  Package, 
  BarChart3, 
  Calendar,
  FileText,
  Shield,
  Box,
  Clock,
  TrendingUp,
  TrendingDown,
  Edit,
  MapPin,
  CalendarDays,
  Inbox,
  ChevronRight,
  Activity,
  Search,
  Plus,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Screen mockup component
function ScreenMockup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl overflow-hidden shadow-2xl border bg-white border-gray-200", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50 border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center text-sm font-medium text-gray-600">{title}</div>
        <div className="w-16" />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

// Module screens data
const moduleScreens = [
  {
    id: 'ativos',
    name: 'Ativos',
    icon: Box,
    description: 'Cadastre equipamentos com hierarquia, QR codes e historico completo.',
    features: ['Arvore de localizacao', 'QR Code para identificacao', 'Historico de manutencoes', 'Documentos anexados', 'Fotos e especificacoes'],
  },
  {
    id: 'ordens',
    name: 'Ordens de Servico',
    icon: ClipboardList,
    description: 'Crie, atribua e acompanhe OS com workflow, checklist e custos.',
    features: ['Workflow automatico', 'Atribuicao de tecnicos', 'Checklist de execucao', 'Registro de custos', 'Fotos e assinaturas'],
  },
  {
    id: 'programacao',
    name: 'Programacao',
    icon: Calendar,
    description: 'Planeje preventivas por tempo, uso ou condicao com geracao automatica de OS.',
    features: ['Planos preventivos', 'Gatilhos por tempo/uso', 'Visualizacao calendario', 'Geracao automatica de OS', 'Templates reutilizaveis'],
  },
  {
    id: 'agenda',
    name: 'Agenda',
    icon: CalendarDays,
    description: 'Calendario interativo com prioridades, filtros e replanejamento rapido.',
    features: ['Visao diaria/semanal/mensal', 'Drag and drop para reagendar', 'Cores por prioridade', 'Filtros por tecnico', 'Integracao com calendario'],
  },
  {
    id: 'solicitacoes',
    name: 'Solicitacoes',
    icon: Inbox,
    description: 'Portal de solicitacoes com triagem e SLA por prioridade.',
    features: ['Portal de solicitacoes', 'Triagem automatica', 'SLA por prioridade', 'Conversao em OS', 'Comunicacao com solicitante'],
  },
  {
    id: 'metricas',
    name: 'Metricas',
    icon: BarChart3,
    description: 'KPIs em tempo real para MTTR, MTBF, backlog e custos.',
    features: ['MTTR e MTBF', 'Backlog de OS', 'Custos por ativo/categoria', 'Performance de tecnicos', 'Tendencias historicas'],
  },
  {
    id: 'estoque',
    name: 'Estoque',
    icon: Package,
    description: 'Controle de pecas, insumos e ferramentas com alertas de minimo.',
    features: ['Movimentacoes entrada/saida', 'Estoque minimo/maximo', 'Vinculo com OS', 'Inventario periodico', 'Fornecedores'],
  },
  {
    id: 'procedimentos',
    name: 'Procedimentos',
    icon: FileText,
    description: 'Biblioteca tecnica com passo a passo, fotos e checklists padronizados.',
    features: ['Passo a passo detalhado', 'Fotos e videos', 'Checklists de verificacao', 'Versionamento', 'Categorizacao'],
  },
  {
    id: 'relatorios',
    name: 'Relatorios',
    icon: FileText,
    description: 'Relatorios de PMOC, custos e KPIs com exportacao facil.',
    features: ['Relatorios PMOC', 'Exportacao PDF/Excel', 'Agendamento automatico', 'Filtros avancados', 'Envio por e-mail'],
  },
]

const benefits = [
  'Reducao de custos com corretivas',
  'Mais preventivas no prazo',
  'Conformidade PMOC automatizada',
  'Visibilidade total do parque de ativos',
  'Historico completo para auditorias',
  'Integracao com sensores IoT (TrakSense)',
]

export function TrakNorPage() {
  const [activeModule, setActiveModule] = useState('ativos')
  const activeScreen = moduleScreens.find(m => m.id === activeModule)!

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-white to-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-400 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-teal-100 text-teal-700">CMMS</Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">TrakNor</h1>
              <p className="text-xl text-gray-600 mb-4">CMMS completo para gestao de manutencao</p>
              <p className="text-lg text-gray-500 mb-8">Controle ordens, planos e ativos em uma unica plataforma com rastreabilidade total.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Agendar demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="lg" variant="outline">Ver Planos</Button>
                </Link>
              </div>
            </div>
            
            {/* Hero Screen Mockup */}
            <ScreenMockup title="TrakNor — Dashboard">
              <div className="p-4 bg-gray-50 min-h-[400px]">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">OS Abertas</div>
                    <div className="text-xl font-bold text-gray-900">24</div>
                    <div className="text-xs text-amber-600">8 urgentes</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">MTTR</div>
                    <div className="text-xl font-bold text-gray-900">4.2h</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> -12%
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Disponibilidade</div>
                    <div className="text-xl font-bold text-gray-900">98.5%</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +2%
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Preventivas</div>
                    <div className="text-xl font-bold text-gray-900">87%</div>
                    <div className="text-xs text-gray-500">concluídas</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-lg p-4 border shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">OS por Mês</div>
                    <div className="flex items-end gap-3 h-32">
                      {[45, 62, 38, 71, 55, 68, 52].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-teal-500 rounded-t" style={{ height: `${h}%` }} />
                          <span className="text-xs text-gray-400">{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">Por Tipo</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-500" />
                        <span className="text-xs text-gray-600 flex-1">Preventiva</span>
                        <span className="text-xs font-medium">62%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-xs text-gray-600 flex-1">Corretiva</span>
                        <span className="text-xs font-medium">28%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                        <span className="text-xs text-gray-600 flex-1">Preditiva</span>
                        <span className="text-xs font-medium">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 bg-white rounded-lg border shadow-sm">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Ordens de Serviço Recentes</span>
                    <Button variant="ghost" size="sm" className="text-xs h-7">Ver todas</Button>
                  </div>
                  <div className="divide-y">
                    {[
                      { id: 'OS-2024-0847', asset: 'Chiller 01', type: 'Preventiva', status: 'Em Andamento', tech: 'Carlos Silva' },
                      { id: 'OS-2024-0846', asset: 'Split Sala 12', type: 'Corretiva', status: 'Aguardando Peça', tech: 'Ana Costa' },
                    ].map((os) => (
                      <div key={os.id} className="px-4 py-2 flex items-center gap-4 text-xs">
                        <span className="font-medium text-teal-600">{os.id}</span>
                        <span className="text-gray-700 flex-1">{os.asset}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{os.type}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          os.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        )}>{os.status}</span>
                        <span className="text-gray-500 w-24">{os.tech}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* Interactive Modules Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Explore os Módulos do TrakNor
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Clique em cada módulo para ver detalhes e preview da interface.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              {moduleScreens.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                    activeModule === module.id 
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-white border hover:border-teal-300 hover:bg-teal-50'
                  )}
                >
                  <module.icon className={cn("w-5 h-5", activeModule === module.id ? 'text-white' : 'text-teal-600')} />
                  <span className="font-medium">{module.name}</span>
                  <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", activeModule === module.id ? 'text-white rotate-90' : 'text-gray-400')} />
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-teal-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <activeScreen.icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{activeScreen.name}</h3>
                      <p className="text-sm text-gray-500">Módulo do TrakNor CMMS</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{activeScreen.description}</p>
                  
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {activeScreen.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-100 rounded-xl p-4">
                    <ModulePreview moduleId={activeModule} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Full Screen Showcase */}
      <section className="py-16 md:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-900 text-teal-300">Interface moderna</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Veja o TrakNor em Ação</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Interface intuitiva projetada para produtividade.
            </p>
          </div>

          <ScreenMockup title="TrakNor — Ordem de Serviço #OS-2024-0847" className="max-w-5xl mx-auto">
            <div className="flex min-h-[500px]">
              <div className="w-56 bg-gray-50 border-r p-3 space-y-1">
                {[
                  { icon: Activity, name: 'Dashboard', active: false },
                  { icon: Box, name: 'Ativos', active: false },
                  { icon: ClipboardList, name: 'Ordens de Serviço', active: true },
                  { icon: Calendar, name: 'Programação', active: false },
                  { icon: CalendarDays, name: 'Agenda', active: false },
                  { icon: Inbox, name: 'Solicitações', active: false },
                  { icon: Package, name: 'Estoque', active: false },
                  { icon: BarChart3, name: 'Métricas', active: false },
                  { icon: FileText, name: 'Relatórios', active: false },
                ].map((item) => (
                  <div key={item.name} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm", item.active ? 'bg-teal-500 text-white' : 'text-gray-600')}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">OS-2024-0847</h2>
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Em Andamento</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Manutenção Preventiva • Chiller 01</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" /> Editar</Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700"><CheckCircle2 className="w-4 h-4 mr-1" /> Concluir</Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-1">Técnico Responsável</div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-teal-700">CS</span>
                          </div>
                          <span className="text-sm font-medium">Carlos Silva</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-1">Prazo</div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">31/12/2025 18:00</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <span className="font-medium text-sm">Checklist de Execução</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {[
                          { done: true, text: 'Verificar pressão do gás refrigerante' },
                          { done: true, text: 'Limpar filtros de ar' },
                          { done: true, text: 'Verificar corrente elétrica' },
                          { done: false, text: 'Testar termostato' },
                          { done: false, text: 'Registrar leituras no sistema' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center", item.done ? 'bg-teal-500 border-teal-500' : 'border-gray-300')}>
                              {item.done && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn("text-sm", item.done ? 'text-gray-400 line-through' : 'text-gray-700')}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-2">Ativo</div>
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="w-4 h-4 text-teal-600" />
                        <span className="font-medium text-sm">Chiller 01</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>Carrier 30XA-150</div>
                        <div className="flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> Bloco A, Térreo</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-2">Custos</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Mão de obra</span><span className="font-medium">R$ 350,00</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Peças</span><span className="font-medium">R$ 0,00</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1"><span className="font-medium">Total</span><span className="font-bold text-teal-600">R$ 350,00</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScreenMockup>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Resultados</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Benefícios Comprovados</h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '40%', label: 'Redução em custos corretivos', icon: TrendingDown },
                { value: '98%', label: 'Disponibilidade de equipamentos', icon: Activity },
                { value: '3.5h', label: 'MTTR médio alcançado', icon: Clock },
                { value: '100%', label: 'Conformidade PMOC', icon: Shield },
              ].map((stat) => (
                <Card key={stat.label} className="p-6 text-center border-teal-100">
                  <stat.icon className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-teal-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronto para transformar sua manutenção?</h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração gratuita e veja como o TrakNor pode revolucionar a gestão de manutenção da sua empresa.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Agendar demonstração <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/precos">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Ver Planos e Preços</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// Module Preview Component
function ModulePreview({ moduleId }: { moduleId: string }) {
  const previews: Record<string, React.ReactNode> = {
    ativos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input className="text-xs bg-gray-50 px-2 py-1 rounded border flex-1" placeholder="Buscar ativos..." />
          <Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Novo</Button>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Chiller 01', location: 'Bloco A, Térreo', status: 'Operacional' },
            { name: 'Split Sala 12', location: 'Bloco B, 2º Andar', status: 'Em Manutenção' },
            { name: 'Fan Coil 03', location: 'Bloco A, 1º Andar', status: 'Operacional' },
          ].map((asset) => (
            <div key={asset.name} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-xs">
              <Box className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium">{asset.name}</div>
                <div className="text-gray-500">{asset.location}</div>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-xs", asset.status === 'Operacional' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{asset.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    ordens: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 bg-teal-100 text-teal-700 rounded">Todas</span>
            <span className="text-xs px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">Abertas</span>
            <span className="text-xs px-2 py-1 hover:bg-gray-100 rounded cursor-pointer">Concluídas</span>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Nova OS</Button>
        </div>
        <div className="space-y-2">
          {[
            { id: 'OS-0847', type: 'Preventiva', asset: 'Chiller 01', status: 'Em Andamento' },
            { id: 'OS-0846', type: 'Corretiva', asset: 'Split Sala 12', status: 'Aguardando' },
            { id: 'OS-0845', type: 'Preventiva', asset: 'Fan Coil 03', status: 'Concluída' },
          ].map((os) => (
            <div key={os.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-xs">
              <ClipboardList className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium text-teal-600">{os.id}</div>
                <div className="text-gray-500">{os.asset} • {os.type}</div>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-xs", os.status === 'Concluída' ? 'bg-green-100 text-green-700' : os.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>{os.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    programacao: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Planos Ativos</div>
        <div className="space-y-2">
          {[
            { name: 'Manutenção Mensal Chillers', freq: 'Mensal', next: '15/01/2025' },
            { name: 'Troca de Filtros', freq: 'Trimestral', next: '01/02/2025' },
            { name: 'Inspeção Elétrica', freq: 'Semestral', next: '15/03/2025' },
          ].map((plan) => (
            <div key={plan.name} className="p-2 bg-gray-50 rounded text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium">{plan.name}</span>
                <span className="text-teal-600">{plan.freq}</span>
              </div>
              <div className="text-gray-500 mt-1">Próxima: {plan.next}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    agenda: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Dezembro 2025</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">&lt;</Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">&gt;</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-gray-400 py-1">{d}</div>
          ))}
          {[29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((day, i) => (
            <div key={i} className={cn("py-1 rounded", day === 31 ? 'bg-teal-500 text-white' : [3, 8, 15].includes(day) ? 'bg-teal-100' : '')}>{day}</div>
          ))}
        </div>
      </div>
    ),
    solicitacoes: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Solicitações Pendentes</span>
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">5 novas</span>
        </div>
        <div className="space-y-2">
          {[
            { desc: 'Ar condicionado não gela', local: 'Sala 205', time: '2h atrás' },
            { desc: 'Ruído estranho no split', local: 'Recepção', time: '4h atrás' },
            { desc: 'Vazamento de água', local: 'CPD', time: '1 dia' },
          ].map((req, i) => (
            <div key={i} className="p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium">{req.desc}</div>
              <div className="flex justify-between text-gray-500 mt-1">
                <span>{req.local}</span>
                <span>{req.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    metricas: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-lg font-bold text-teal-600">4.2h</div>
            <div className="text-xs text-gray-500">MTTR</div>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-lg font-bold text-teal-600">720h</div>
            <div className="text-xs text-gray-500">MTBF</div>
          </div>
        </div>
        <div className="h-16 flex items-end gap-1">
          {[40, 55, 35, 70, 45, 60, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-teal-500 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
    estoque: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Alertas de Estoque</div>
        <div className="space-y-2">
          {[
            { item: 'Filtro G4', qtd: 3, min: 10, status: 'Crítico' },
            { item: 'Gás R410A', qtd: 2, min: 5, status: 'Baixo' },
            { item: 'Correia V', qtd: 8, min: 10, status: 'Baixo' },
          ].map((item) => (
            <div key={item.item} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <Package className={cn("w-4 h-4", item.status === 'Crítico' ? 'text-red-500' : 'text-amber-500')} />
              <div className="flex-1">
                <div className="font-medium">{item.item}</div>
                <div className="text-gray-500">Qtd: {item.qtd} / Mín: {item.min}</div>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-xs", item.status === 'Crítico' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    procedimentos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Biblioteca de Procedimentos</div>
        <div className="space-y-2">
          {[
            { name: 'Manutenção Preventiva Chiller', steps: 15 },
            { name: 'Troca de Filtros Split', steps: 8 },
            { name: 'Verificação Elétrica', steps: 12 },
          ].map((proc) => (
            <div key={proc.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <FileText className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium">{proc.name}</div>
                <div className="text-gray-500">{proc.steps} etapas</div>
              </div>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    ),
    relatorios: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Relatórios Disponíveis</div>
        <div className="space-y-2">
          {[
            { name: 'Relatório PMOC', format: 'PDF' },
            { name: 'KPIs de Manutenção', format: 'Excel' },
            { name: 'Custos por Período', format: 'PDF' },
            { name: 'Histórico de OS', format: 'Excel' },
          ].map((report) => (
            <div key={report.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <FileText className="w-4 h-4 text-teal-500" />
              <span className="flex-1">{report.name}</span>
              <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">{report.format}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  }
  return previews[moduleId] || <div className="text-center py-8 text-gray-500">Preview não disponível</div>
}
