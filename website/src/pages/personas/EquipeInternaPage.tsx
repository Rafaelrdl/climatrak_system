import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Activity,
  DollarSign,
  FileCheck,
  ShieldCheck,
  Check,
  CheckCircle2,
  Brain,
  Bell,
  Wrench,
  Clock,
  AlertTriangle,
  Zap,
  Calendar,
  Package,
  Target,
  LineChart,
  Shield,
  Play,
} from 'lucide-react'

// ============================================================================
// DATA
// ============================================================================

const heroStats = [
  { value: '-47%', label: 'Corretivas não planejadas' },
  { value: 'R$ 2.4M', label: 'Economizados por clientes' },
  { value: '100%', label: 'Conformidade PMOC' },
  { value: '< 4 meses', label: 'Payback médio' },
]

const painPoints = [
  {
    icon: AlertTriangle,
    problem: 'Falhas inesperadas',
    description: 'Equipamentos param sem aviso, gerando custos emergenciais e reclamações.',
    cost: 'R$ 150 mil/ano em corretivas',
  },
  {
    icon: FileCheck,
    problem: 'PMOC manual',
    description: 'Horas perdidas gerando laudos em planilhas. Risco de multas por não conformidade.',
    cost: 'R$ 15 mil em multas potenciais',
  },
  {
    icon: Clock,
    problem: 'Zero visibilidade',
    description: 'Não sabe quanto gasta por ativo. Decisões baseadas em achismo.',
    cost: 'Orçamento estourado todo ano',
  },
]

const mainFeatures = [
  {
    icon: ClipboardList,
    title: 'Gestão Completa de Ativos',
    description:
      'Cadastro hierárquico de equipamentos HVAC, histórico completo de manutenções, documentação técnica anexada e QR Code para acesso rápido em campo.',
    benefits: ['Hierarquia ilimitada', 'Histórico completo', 'Documentação anexada', 'QR Code'],
    result: 'Encontre qualquer informação em segundos',
  },
  {
    icon: Calendar,
    title: 'Planos de Manutenção',
    description:
      'Crie planos preventivos baseados em tempo, horas de operação ou leituras de sensores. Gere OS automaticamente e nunca perca um prazo.',
    benefits: ['Gatilhos flexíveis', 'OS automáticas', 'Calendário visual', 'Alertas antecipados'],
    result: 'Reduza até 47% das manutenções corretivas',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    description:
      'Gerencie peças e consumíveis com níveis mínimos, requisições automáticas e rastreamento de uso por ordem de serviço.',
    benefits: ['Níveis mínimos', 'Requisições auto', 'Rastreio por OS', 'Custo por ativo'],
    result: 'Nunca mais pare por falta de peça',
  },
  {
    icon: DollarSign,
    title: 'Orçamento Integrado',
    description:
      'Defina orçamentos anuais por centro de custo, acompanhe gastos em tempo real e receba alertas antes de estourar o limite.',
    benefits: ['Budget por área', 'Alertas de desvio', 'Projeção de gastos', 'Relatórios gerenciais'],
    result: 'Prove o valor da manutenção para a diretoria',
  },
  {
    icon: ShieldCheck,
    title: 'Conformidade PMOC',
    description:
      'Gere laudos PMOC automaticamente a partir das OS executadas. Rastreabilidade total para auditorias e órgãos reguladores.',
    benefits: ['Laudos automáticos', 'Evidências anexadas', 'Assinatura digital', 'Exportação PDF'],
    result: '100% conformidade, zero multas',
  },
  {
    icon: Brain,
    title: 'Clima IA Integrada',
    description:
      'Inteligência artificial que preenche OS, sugere diagnósticos, analisa causas raiz e ajuda técnicos em campo com troubleshooting.',
    benefits: ['Preenchimento auto', 'Diagnóstico IA', 'Análise de causas', 'Base de conhecimento'],
    result: 'Técnicos 40% mais produtivos',
  },
]

const iotFeatures = [
  {
    icon: Activity,
    title: 'Monitoramento 24/7',
    description: 'Sensores coletam dados de temperatura, umidade e pressão em tempo real.',
  },
  {
    icon: Bell,
    title: 'Alertas Inteligentes',
    description: 'Notificações quando variáveis saem do padrão configurado por você.',
  },
  {
    icon: AlertTriangle,
    title: 'Alerta → OS Automática',
    description: 'Alertas críticos geram ordens de serviço automaticamente no CMMS.',
  },
  {
    icon: LineChart,
    title: 'Dashboards Customizáveis',
    description: 'Crie cards, gráficos e tabelas do seu jeito, sem precisar de TI.',
  },
]

const kpis = [
  { name: 'MTTR', description: 'Tempo médio de reparo', icon: Clock },
  { name: 'MTBF', description: 'Tempo médio entre falhas', icon: Zap },
  { name: 'Backlog', description: 'OS em aberto por prioridade', icon: ClipboardList },
  { name: 'Disponibilidade', description: '% de uptime dos ativos', icon: Target },
  { name: 'Custo/Ativo', description: 'Gasto por equipamento', icon: DollarSign },
  { name: 'Preventiva %', description: 'Ratio preventiva vs corretiva', icon: Shield },
]

const testimonials = [
  {
    name: 'Ricardo Mendes',
    role: 'Gerente de Facilities - Hospital São Lucas',
    avatar: 'RM',
    text: 'Reduzimos 45% das manutenções corretivas no primeiro ano. Os laudos PMOC saem em minutos. Antes levava 2 dias.',
    metric: '45% menos corretivas',
  },
  {
    name: 'Fernanda Costa',
    role: 'Coord. Manutenção - Shopping Center',
    avatar: 'FC',
    text: 'O monitoramento IoT nos salvou de uma falha crítica no chiller central. Detectamos o problema 18 horas antes.',
    metric: 'R$ 200 mil evitados',
  },
  {
    name: 'André Lima',
    role: 'Diretor de Operações - Indústria Alimentícia',
    avatar: 'AL',
    text: 'Visibilidade total dos custos por ativo. Agora sei exatamente onde investir e onde cortar. O payback veio em 3 meses.',
    metric: 'Payback em 3 meses',
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function DashboardMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">ClimaTrak Dashboard</div>
              <div className="text-sm text-teal-100">Hospital São Lucas</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm">Online</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'OS Abertas', value: '12', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Ativos Críticos', value: '3', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Preventivas Mês', value: '28', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'MTTR (h)', value: '4.2', color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map((stat) => (
            <div key={stat.label} className={cn('rounded-xl p-4 text-center', stat.bg)}>
              <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Manutenções por Tipo</span>
            <Badge variant="secondary">Últimos 30 dias</Badge>
          </div>
          <div className="flex items-end gap-2 h-32">
            {[65, 45, 80, 55, 70, 40, 90].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full rounded-t',
                    i % 2 === 0 ? 'bg-teal-500' : 'bg-teal-300'
                  )}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-400">{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent OS */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 mb-2">OS Recentes</div>
          {[
            { id: '#4521', asset: 'Chiller 01', status: 'Em andamento', priority: 'Alta' },
            { id: '#4520', asset: 'Fan Coil UTI', status: 'Aguardando peça', priority: 'Crítica' },
            { id: '#4519', asset: 'Split Recepção', status: 'Concluída', priority: 'Normal' },
          ].map((os) => (
            <div key={os.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-500">{os.id}</span>
                <span className="text-sm font-medium">{os.asset}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    os.priority === 'Crítica' && 'bg-red-100 text-red-700',
                    os.priority === 'Alta' && 'bg-amber-100 text-amber-700',
                    os.priority === 'Normal' && 'bg-gray-100 text-gray-700'
                  )}
                >
                  {os.priority}
                </Badge>
                <span className="text-xs text-gray-500">{os.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IoTMonitorMockup() {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold">TrakSense Monitor</div>
            <div className="text-sm text-gray-400">Chiller Principal - Sala de Máquinas</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-400">Live</span>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Temp. Saída', value: '7.2°C', status: 'ok', target: '7°C' },
          { label: 'Pressão Alta', value: '18.5 bar', status: 'warning', target: '18 bar' },
          { label: 'Corrente', value: '45.2 A', status: 'ok', target: '50 A' },
        ].map((gauge) => (
          <div key={gauge.label} className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-2">{gauge.label}</div>
            <div
              className={cn(
                'text-2xl font-bold mb-1',
                gauge.status === 'ok' ? 'text-green-400' : 'text-amber-400'
              )}
            >
              {gauge.value}
            </div>
            <div className="text-xs text-gray-500">Target: {gauge.target}</div>
          </div>
        ))}
      </div>

      {/* Mini Chart */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Temperatura (24h)</span>
          <Badge className="bg-cyan-500/20 text-cyan-400">Estável</Badge>
        </div>
        <div className="h-20 flex items-end gap-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const height = 40 + Math.sin(i / 3) * 20 + Math.random() * 10
            return (
              <div
                key={i}
                className="flex-1 bg-cyan-500/60 rounded-t"
                style={{ height: `${height}%` }}
              />
            )
          })}
        </div>
      </div>

      {/* Alert */}
      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-400">Pressão acima do normal</div>
          <div className="text-xs text-gray-400">Detectado às 14:32 - OS #4522 criada automaticamente</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EquipeInternaPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Para Equipes Internas</Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Chega de <span className="text-gradient">apagar incêndios</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-xl">
                Você não foi contratado para lidar com emergências todo dia. 
                <strong className="text-foreground"> Seu trabalho é garantir que nada pare.</strong>
              </p>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Com ClimaTrak, sua equipe previne falhas, comprova resultados 
                e entrega conformidade PMOC em cliques — não em dias.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button asChild size="xl">
                  <Link to="/demo?persona=equipe-interna">
                    Quero sair do modo bombeiro
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link to="/produtos">
                    <Play className="mr-2 h-5 w-5" />
                    Ver em 2 minutos
                  </Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Setup em 1 semana</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Payback em &lt; 4 meses</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <DashboardMockup />
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Sistema online</span>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">0 alertas críticos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-teal-600 text-white">
        <div className="container-wide">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-teal-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="section-padding bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-100 text-red-700">Reconhece esses problemas?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Sua rotina não deveria ser assim
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.problem} className="bg-white rounded-2xl p-6 border-2 border-red-100">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-red-700">{point.problem}</h3>
                  <p className="text-muted-foreground mb-3">{point.description}</p>
                  <div className="bg-red-50 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-red-600">{point.cost}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades Principais</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para gerenciar manutenção
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Do cadastro de ativos à geração de laudos PMOC, com inteligência artificial
              integrada para acelerar diagnósticos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="card-hover border-2 hover:border-teal-200">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {feature.benefits.map((benefit) => (
                        <Badge key={benefit} variant="secondary" className="bg-teal-50 text-teal-700">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* IoT Section */}
      <section className="section-padding bg-gray-900 text-white">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-cyan-900 text-cyan-300">TrakSense IoT</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Monitoramento que previne falhas
              </h2>
              <p className="text-gray-400 mb-8">
                Sensores inteligentes coletam dados 24/7 e alertam sua equipe antes que
                problemas virem paradas. Alertas críticos geram OS automaticamente.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {iotFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div key={feature.title} className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{feature.title}</h4>
                        <p className="text-sm text-gray-400">{feature.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <IoTMonitorMockup />
          </div>
        </div>
      </section>

      {/* KPIs Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">KPIs e Relatórios</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Indicadores que importam para sua operação
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dashboards executivos com os KPIs que gestores e diretoria precisam para
              tomar decisões baseadas em dados.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <div
                  key={kpi.name}
                  className="bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-teal-200 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="font-bold text-lg mb-1">{kpi.name}</div>
                  <div className="text-xs text-muted-foreground">{kpi.description}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PMOC Compliance */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700">Conformidade</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                PMOC sem dor de cabeça
              </h2>
              <p className="text-muted-foreground mb-6">
                Gere laudos PMOC automaticamente a partir das ordens de serviço executadas.
                Todas as evidências, assinaturas e rastreabilidade em um só lugar.
              </p>
              <div className="space-y-4">
                {[
                  'Laudos gerados automaticamente das OS',
                  'Evidências fotográficas anexadas',
                  'Assinatura digital do técnico responsável',
                  'Exportação em PDF para auditorias',
                  'Histórico completo por equipamento',
                  'Alertas de vencimento de prazos',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold">Laudo PMOC</h3>
                  <p className="text-sm text-gray-500">Hospital São Lucas - Janeiro/2026</p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Equipamentos avaliados</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Manutenções realizadas</span>
                  <span className="font-medium">52</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Não conformidades</span>
                  <span className="font-medium text-amber-600">3</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Responsável técnico</span>
                  <span className="font-medium">Eng. Carlos Silva</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button variant="outline" className="flex-1">
                  Ver detalhes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Quem usa, recomenda
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5 text-amber-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-teal-700">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Módulos Inclusos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ecossistema completo para sua operação
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                name: 'TrakNor CMMS',
                description: 'Gestão de ativos, OS, planos e equipes',
                icon: Wrench,
                color: 'teal',
              },
              {
                name: 'TrakSense IoT',
                description: 'Monitoramento 24/7 com alertas',
                icon: Activity,
                color: 'cyan',
              },
              {
                name: 'TrakLedger',
                description: 'Orçamentos e controle de custos',
                icon: DollarSign,
                color: 'violet',
              },
              {
                name: 'Clima IA',
                description: 'Inteligência artificial integrada',
                icon: Brain,
                color: 'amber',
              },
            ].map((module) => {
              const Icon = module.icon
              return (
                <Card key={module.name} className="card-hover text-center">
                  <CardContent className="pt-6">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center',
                        module.color === 'teal' && 'bg-teal-100',
                        module.color === 'cyan' && 'bg-cyan-100',
                        module.color === 'violet' && 'bg-violet-100',
                        module.color === 'amber' && 'bg-amber-100'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-8 h-8',
                          module.color === 'teal' && 'text-teal-600',
                          module.color === 'cyan' && 'text-cyan-600',
                          module.color === 'violet' && 'text-violet-600',
                          module.color === 'amber' && 'text-amber-600'
                        )}
                      />
                    </div>
                    <h3 className="font-semibold mb-2">{module.name}</h3>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Quanto você perde por ano com manutenções corretivas?
          </h2>
          <p className="text-lg text-teal-100 mb-4 max-w-2xl mx-auto">
            Nossos clientes economizam em média <strong className="text-white">R$ 2.4 milhões por ano</strong> ao 
            substituir emergências por prevenção inteligente.
          </p>
          <p className="text-teal-200 mb-8">
            Se sua operação gasta mais de R$ 100 mil/ano com corretivas, podemos mostrar o caminho.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
              <Link to="/demo?persona=equipe-interna">
                Calcular minha economia
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link to="/precos">Ver planos e preços</Link>
            </Button>
          </div>
          <p className="text-sm text-teal-200 mt-6">
            ✓ Demonstração personalizada gratuita &nbsp;|&nbsp; ✓ Análise de ROI inclusa &nbsp;|&nbsp; ✓ Sem compromisso
          </p>
        </div>
      </section>
    </div>
  )
}
