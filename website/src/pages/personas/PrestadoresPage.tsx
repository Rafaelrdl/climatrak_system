import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  DollarSign,
  FileCheck,
  TrendingUp,
  BarChart3,
  MapPin,
  Route,
  Calculator,
  Smartphone,
  Users,
  CheckCircle2,
  Check,
  MessageSquareText,
  FileText,
  Clock,
  Calendar,
  Target,
  Truck,
  UserCheck,
  Receipt,
  Play,
  Layers,
} from 'lucide-react'

// ============================================================================
// DATA
// ============================================================================

const heroStats = [
  { value: '+47%', label: 'Produtividade da equipe' },
  { value: '3x', label: 'Mais orçamentos aprovados' },
  { value: '-35%', label: 'Custo com combustível' },
  { value: 'R$ 15 mil', label: 'Economia mensal média' },
]

const painPoints = [
  {
    icon: Route,
    problem: 'Rotas mal planejadas',
    description: 'Técnicos perdem horas no trânsito. Combustível jogado fora.',
    cost: 'R$ 5 mil/mês em deslocamento',
  },
  {
    icon: Calculator,
    problem: 'Orçamentos demorados',
    description: 'Cliente esfria enquanto você monta orçamento no escritório.',
    cost: '40% dos orçamentos rejeitados',
  },
  {
    icon: Users,
    problem: 'Clientes ligando',
    description: '"Cadê meu técnico?", "Já começou?" — sua equipe vira call center.',
    cost: '20h/mês em ligações',
  },
]

const mainFeatures = [
  {
    icon: CheckCircle2,
    title: 'Tudo da Equipe Interna',
    description:
      'Gestão de ativos, estoque, orçamento, conformidade PMOC, análise de custos, monitoramento IoT e IA — tudo incluso.',
    benefits: ['CMMS completo', 'IoT integrado', 'Financeiro', 'Clima IA'],
    result: 'Uma plataforma, zero gambiarras',
  },
  {
    icon: Calculator,
    title: 'Orçamentos Profissionais',
    description:
      'Crie orçamentos detalhados em campo com peças, mão de obra e deslocamento. Envie por WhatsApp ou PDF com um toque.',
    benefits: ['Templates prontos', 'Catálogo de peças', 'Margem automática', 'WhatsApp direto'],
    result: '3x mais aprovações de orçamento',
  },
  {
    icon: Route,
    title: 'Roteirização Inteligente',
    description:
      'Algoritmos otimizam rotas considerando localização, prioridade e janela de atendimento. Economize combustível e tempo.',
    benefits: ['Otimização IA', 'Economia KM', 'Janelas de tempo', 'Redistribuição'],
    result: '-35% em custos de deslocamento',
  },
  {
    icon: MapPin,
    title: 'Rastreamento de Equipe',
    description:
      'Localização em tempo real dos técnicos com respeito à privacidade. Controle de jornada e relatórios de deslocamento.',
    benefits: ['GPS em tempo real', 'Jornada de trabalho', 'Histórico de rotas', 'Privacidade'],
    result: 'Zero ligações perguntando "onde está?"',
  },
  {
    icon: FileCheck,
    title: 'Gestão de SLA',
    description:
      'Defina prazos por cliente e tipo de chamado. Alertas automáticos antes do vencimento e relatórios de cumprimento.',
    benefits: ['Prazos por cliente', 'Alertas auto', 'Relatórios SLA', 'Penalidades'],
    result: '98% de SLA cumprido',
  },
  {
    icon: Users,
    title: 'Multi-cliente',
    description:
      'Organize ativos, contratos e OS por cliente. Cada cliente vê apenas seus dados no portal dedicado.',
    benefits: ['Portal do cliente', 'Contratos separados', 'Visão individual', 'White-label'],
    result: '-70% de ligações de status',
  },
]

const quoteFeatures = [
  'Templates por tipo de serviço (instalação, manutenção, reparo)',
  'Catálogo de peças com preços atualizados',
  'Cálculo automático de margem de lucro',
  'Fotos do equipamento anexadas',
  'Envio por WhatsApp, e-mail ou PDF',
  'Acompanhamento de status (enviado, visualizado, aprovado)',
  'Histórico completo por cliente',
  'Conversão automática em OS quando aprovado',
]

const fieldServiceFeatures = [
  {
    icon: Smartphone,
    title: 'App Mobile Completo',
    description: 'Técnicos acessam OS, atualizam status, registram fotos e geram orçamentos offline.',
  },
  {
    icon: Clock,
    title: 'Check-in/Check-out',
    description: 'Registro automático de chegada e saída com geolocalização.',
  },
  {
    icon: FileText,
    title: 'Laudos Digitais',
    description: 'Preencha laudos técnicos com assinatura digital do cliente na hora.',
  },
  {
    icon: Receipt,
    title: 'Faturamento Automático',
    description: 'OS concluídas geram faturamento automaticamente com base no contrato.',
  },
]

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Empresa terceirizada - 15 técnicos',
    avatar: 'CS',
    text: 'Os orçamentos saem na hora pelo app. Nossa taxa de aprovação foi de 35% para 78%.',
    metric: '+120% aprovações',
  },
  {
    name: 'Roberto Almeida',
    role: 'Parceiro HVAC - RJ',
    avatar: 'RA',
    text: 'A roteirização nos fez economizar R$ 4.200/mês em combustível. Os técnicos atendem 2 clientes a mais por dia.',
    metric: 'R$ 50 mil/ano economizados',
  },
  {
    name: 'Ana Costa',
    role: 'Coordenadora técnica - MG',
    avatar: 'AC',
    text: 'O portal do cliente acabou com as ligações de "onde está meu técnico". Ganhamos 20h/mês da equipe de volta.',
    metric: '-70% ligações',
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function QuoteMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-teal-100">Orçamento #2026-089</div>
            <div className="font-bold text-lg">TechCool HVAC</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-teal-100">Válido até</div>
            <div className="font-medium">25/01/2026</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Cliente</div>
          <div className="font-medium">Maria Santos - Clínica Odonto Premium</div>
          <div className="text-sm text-gray-500">Rua das Flores, 123 - Apt 45</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Equipamento</div>
          <div className="font-medium">Split Inverter 24000 BTUs - Samsung</div>
          <div className="text-sm text-gray-500">Problema: Não está gelando adequadamente</div>
        </div>
        <div className="border-t border-b py-4 my-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Serviços e peças</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mão de obra - Recarga de gás</span>
              <span className="font-medium">R$ 280,00</span>
            </div>
            <div className="flex justify-between">
              <span>Gás R410A (800g)</span>
              <span className="font-medium">R$ 180,00</span>
            </div>
            <div className="flex justify-between">
              <span>Limpeza completa (evaporador + condensador)</span>
              <span className="font-medium">R$ 250,00</span>
            </div>
            <div className="flex justify-between">
              <span>Deslocamento</span>
              <span className="font-medium">R$ 80,00</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-3xl font-bold text-teal-600">R$ 790,00</div>
            <div className="text-xs text-gray-400">Margem: 42%</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <MessageSquareText className="w-4 h-4 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoutingMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">Rota do dia</div>
              <div className="text-sm text-teal-100">Técnico: João Silva</div>
            </div>
          </div>
          <Badge className="bg-white/20 text-white">8 atendimentos</Badge>
        </div>
      </div>
      <div className="p-4">
        {/* Map placeholder */}
        <div className="bg-gray-100 rounded-xl h-48 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-cyan-100" />
          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full">
            <path
              d="M 40 40 Q 80 60, 120 50 T 200 80 T 280 60 T 350 100"
              stroke="#0d9488"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,4"
            />
          </svg>
          {/* Points */}
          {[
            { x: 40, y: 40, label: '1' },
            { x: 120, y: 50, label: '2' },
            { x: 200, y: 80, label: '3' },
            { x: 280, y: 60, label: '4' },
            { x: 350, y: 100, label: '5' },
          ].map((point) => (
            <div
              key={point.label}
              className="absolute w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
              style={{ left: point.x - 12, top: point.y - 12 }}
            >
              {point.label}
            </div>
          ))}
          {/* Current location */}
          <div
            className="absolute w-4 h-4 bg-blue-500 rounded-full animate-pulse"
            style={{ left: 36, top: 36 }}
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-teal-700">47 km</div>
            <div className="text-xs text-teal-600">Distância total</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-teal-700">2h 15m</div>
            <div className="text-xs text-teal-600">Deslocamento</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">-12 km</div>
            <div className="text-xs text-green-600">Economia</div>
          </div>
        </div>

        {/* Next stops */}
        <div className="space-y-2">
          {[
            { time: '09:00', client: 'Clínica Odonto', status: 'Em andamento', priority: 'normal' },
            { time: '10:30', client: 'Loja TechMart', status: 'Próximo', priority: 'alta' },
            { time: '12:00', client: 'Escritório ABC', status: 'Agendado', priority: 'normal' },
          ].map((stop, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-teal-700">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{stop.client}</div>
                <div className="text-xs text-gray-500">{stop.time}</div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  stop.status === 'Em andamento' && 'bg-blue-100 text-blue-700',
                  stop.status === 'Próximo' && 'bg-amber-100 text-amber-700',
                  stop.status === 'Agendado' && 'bg-gray-100 text-gray-700'
                )}
              >
                {stop.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MobileAppMockup() {
  return (
    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-[300px] mx-auto">
      <div className="bg-white rounded-[2.5rem] overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">TrakService</div>
              <div className="text-sm text-teal-100">João Silva</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-xl font-bold">8</div>
              <div className="text-xs text-teal-100">Hoje</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-xl font-bold">2</div>
              <div className="text-xs text-teal-100">Orçam.</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-xl font-bold">47km</div>
              <div className="text-xs text-teal-100">Rota</div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Atendimento atual</span>
            </div>
            <div className="font-medium">Clínica Odonto Premium</div>
            <div className="text-xs text-gray-500 mb-2">Split 24000 BTUs - Não gela</div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs">Check-out</Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">Orçamento</Button>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-700 mb-2">Próximos</div>
          <div className="space-y-2">
            {[
              { client: 'Loja TechMart', time: '10:30', type: 'Preventiva' },
              { client: 'Escritório ABC', time: '12:00', type: 'Corretiva' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.client}</div>
                  <div className="text-xs text-gray-500">{item.type}</div>
                </div>
                <span className="text-xs font-medium text-teal-600">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClientPortalMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
      <div className="bg-gray-100 px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold">Portal do Cliente</div>
            <div className="text-sm text-gray-500">Clínica Odonto Premium</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">12</div>
            <div className="text-xs text-gray-500">Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">98%</div>
            <div className="text-xs text-gray-500">SLA cumprido</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">2</div>
            <div className="text-xs text-gray-500">OS abertas</div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="text-sm font-medium text-gray-700 mb-3">Atividade recente</div>
        <div className="space-y-3">
          {[
            { action: 'OS #4521 concluída', time: 'Há 2 horas', icon: CheckCircle2, color: 'text-green-600' },
            { action: 'Orçamento #089 aprovado', time: 'Há 1 dia', icon: FileCheck, color: 'text-blue-600' },
            { action: 'Manutenção preventiva agendada', time: 'Há 3 dias', icon: Calendar, color: 'text-teal-600' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <item.icon className={cn('w-5 h-5', item.color)} />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.action}</div>
                <div className="text-xs text-gray-500">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PrestadoresPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-teal-50 via-white to-teal-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Para Prestadores de Serviço</Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Cresça sem <span className="text-teal-600">virar bagunça</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-xl">
                Mais clientes não pode significar mais caos. 
                <strong className="text-foreground"> Sua operação precisa escalar com controle.</strong>
              </p>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Rotas otimizadas, orçamentos na hora, portal do cliente e zero ligações de status. 
                Atenda mais, gaste menos, fature melhor.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button asChild size="xl" className="bg-teal-600 hover:bg-teal-700">
                  <Link to="/demo?persona=prestadores">
                    Quero escalar com controle
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
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>Onboarding em 3 dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>ROI em &lt; 2 meses</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <QuoteMockup />
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium">+47% produtividade</span>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium">-35% deslocamento</span>
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
            <Badge className="mb-4 bg-red-100 text-red-700">Sua operação sofre com isso?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Crescer não deveria ser tão difícil
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
            <Badge className="mb-4">Funcionalidades TrakService</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Field Service completo para sua operação
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Todas as ferramentas que uma prestadora de serviço HVAC precisa para
              crescer com organização e profissionalismo.
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

      {/* Quote Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Orçamentos</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Orçamentos que impressionam e convertem
              </h2>
              <p className="text-muted-foreground mb-6">
                Gere orçamentos profissionais em campo, com fotos do equipamento, peças
                detalhadas e envio instantâneo para o cliente.
              </p>
              <div className="space-y-3">
                {quoteFeatures.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <QuoteMockup />
          </div>
        </div>
      </section>

      {/* Routing Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <RoutingMockup />
            </div>
            <div className="order-1 lg:order-2">
              <Badge className="mb-4 bg-teal-100 text-teal-700">Roteirização</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Rotas inteligentes que economizam tempo e dinheiro
              </h2>
              <p className="text-muted-foreground mb-6">
                Algoritmos otimizam a sequência de atendimentos considerando distância,
                prioridade e janela de tempo. Redistribua em tempo real quando necessário.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Route, title: 'Otimização automática', desc: 'Melhor sequência calculada' },
                  { icon: Truck, title: 'Economia de KM', desc: 'Menos combustível gasto' },
                  { icon: Clock, title: 'Janelas de tempo', desc: 'Respeita horários do cliente' },
                  { icon: Target, title: 'Redistribuição', desc: 'Reagende em tempo real' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App + Client Portal */}
      <section className="section-padding bg-gray-900 text-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-900 text-teal-300">App Mobile + Portal</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Técnicos e clientes sempre conectados
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              App completo para técnicos em campo e portal de acompanhamento para seus clientes.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="space-y-6">
              {fieldServiceFeatures.slice(0, 2).map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <MobileAppMockup />

            <div className="space-y-6">
              {fieldServiceFeatures.slice(2, 4).map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Client Portal */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Portal do Cliente</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Transparência que fideliza clientes
              </h2>
              <p className="text-muted-foreground mb-6">
                Cada cliente tem acesso a um portal dedicado onde acompanha OS, histórico,
                orçamentos e indicadores de SLA — reduzindo ligações e aumentando satisfação.
              </p>
              <div className="space-y-3">
                {[
                  'Acompanhamento de OS em tempo real',
                  'Histórico completo de manutenções',
                  'Orçamentos para aprovação online',
                  'Indicadores de SLA e cumprimento',
                  'Documentação e laudos disponíveis',
                  'Abertura de chamados pelo portal',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <ClientPortalMockup />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Prestadores que já usam
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
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
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Módulos Inclusos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ecossistema completo para prestadores
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { name: 'TrakNor CMMS', icon: ClipboardList, desc: 'Gestão de OS e ativos' },
              { name: 'TrakSense IoT', icon: BarChart3, desc: 'Monitoramento 24/7' },
              { name: 'TrakLedger', icon: DollarSign, desc: 'Controle financeiro' },
              { name: 'TrakService', icon: Truck, desc: 'Field Service' },
              { name: 'Clima IA', icon: Layers, desc: 'Inteligência artificial' },
            ].map((module) => {
              const Icon = module.icon
              return (
                <Card key={module.name} className="card-hover text-center">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-2xl bg-teal-100 mx-auto mb-3 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{module.name}</h3>
                    <p className="text-xs text-muted-foreground">{module.desc}</p>
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
            Quanto sua equipe desperdiça por mês com rotas ruins e orçamentos lentos?
          </h2>
          <p className="text-lg text-teal-100 mb-4 max-w-2xl mx-auto">
            Nossos clientes economizam em média <strong className="text-white">R$ 15 mil/mês</strong> ao 
            otimizar rotas e acelerar aprovações de orçamento.
          </p>
          <p className="text-teal-200 mb-8">
            Se você tem 5+ técnicos em campo, podemos mostrar o caminho para crescer com controle.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
              <Link to="/demo?persona=prestadores">
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
            ✓ Demonstração personalizada &nbsp;|&nbsp; ✓ Análise de ROI inclusa &nbsp;|&nbsp; ✓ Sem compromisso
          </p>
        </div>
      </section>
    </div>
  )
}
