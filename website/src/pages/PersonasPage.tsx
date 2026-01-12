import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Building2,
  Briefcase,
  Wrench,
  ClipboardList,
  Activity,
  DollarSign,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  MapPin,
  Route,
  Calculator,
  Smartphone,
  Users,
  CheckCircle2,
  Brain,
  Bot,
  Thermometer,
  Clock,
  Check,
  MessageSquareText,
  FileText,
  Sparkles,
  CalendarCheck,
  Receipt,
  BookOpen,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface Feature {
  icon: React.ElementType
  title: string
  description: string
  highlight?: boolean
}

interface PersonaSection {
  id: string
  icon: React.ElementType
  title: string
  subtitle: string
  description: string
  color: 'blue' | 'green' | 'purple'
  modules: {
    name: string
    badge?: string
  }[]
  features: Feature[]
  highlights?: string[]
  cta: {
    text: string
    href: string
  }
}

// ============================================================================
// DATA
// ============================================================================

const personas: PersonaSection[] = [
  {
    id: 'equipe-interna',
    icon: Building2,
    title: 'Empresas com Equipe Interna',
    subtitle: 'Gestão completa e integrada',
    description:
      'Controle total da operação de manutenção, desde o planejamento até a execução, com dados financeiros integrados e conformidade garantida.',
    color: 'blue',
    modules: [
      { name: 'TrakNor CMMS', badge: 'Core' },
      { name: 'TrakSense IoT', badge: 'Monitoramento' },
      { name: 'TrakLedger', badge: 'Financeiro' },
      { name: 'Clima IA', badge: 'Inteligência' },
    ],
    features: [
      {
        icon: ClipboardList,
        title: 'Gestão de Ativos e Estoque',
        description:
          'Cadastro completo de equipamentos, histórico de manutenções, controle de peças e componentes em tempo real.',
      },
      {
        icon: DollarSign,
        title: 'Orçamento Mensal e Anual',
        description:
          'Acompanhamento de custos planejados vs. realizados, alertas de desvios e relatórios gerenciais completos.',
      },
      {
        icon: ShieldCheck,
        title: 'Conformidade PMOC',
        description:
          'Geração automática de laudos técnicos, rastreabilidade de atividades e evidências para auditorias regulatórias.',
      },
      {
        icon: BarChart3,
        title: 'Análise de Custos por Reparo',
        description:
          'Visibilidade detalhada de mão de obra, peças e tempo gasto em cada ordem de serviço executada.',
      },
      {
        icon: TrendingUp,
        title: 'Visão Operacional Completa',
        description:
          'Dashboards executivos, KPIs de desempenho e indicadores de manutenção preventiva e corretiva.',
      },
      {
        icon: Brain,
        title: 'IA para Ordens de Serviço',
        description:
          'Preenchimento inteligente de OS, análise de causas raiz, sugestões de diagnóstico e suporte ao técnico em campo.',
        highlight: true,
      },
      {
        icon: Activity,
        title: 'TrakSense Monitoramento',
        description:
          'Monitoramento 24/7 de equipamentos críticos, detecção de anomalias e conversão automática de alertas em OS.',
      },
      {
        icon: BarChart3,
        title: 'Dashboards Personalizáveis',
        description:
          'Crie visualizações em cards, gráficos e tabelas de forma rápida e fácil, sem necessidade de TI.',
      },
    ],
    highlights: [
      'Reduza falhas em equipamentos críticos',
      'KPIs claros com dados em tempo real',
      'Relatórios PMOC prontos para auditoria',
      'Dashboard com MTTR, backlog e disponibilidade',
    ],
    cta: {
      text: 'Conhecer Soluções para Equipe Interna',
      href: '/demo?persona=equipe-interna',
    },
  },
  {
    id: 'prestadores',
    icon: Briefcase,
    title: 'Empresas Prestadoras de Serviço',
    subtitle: 'Operação e logística integradas',
    description:
      'Todas as funcionalidades de gestão interna mais ferramentas avançadas para despacho de equipes, rastreamento e orçamentos para clientes externos.',
    color: 'green',
    modules: [
      { name: 'TrakNor CMMS', badge: 'Core' },
      { name: 'TrakSense IoT', badge: 'Monitoramento' },
      { name: 'TrakLedger', badge: 'Financeiro' },
      { name: 'TrakService', badge: 'Field Service' },
      { name: 'Clima IA', badge: 'Inteligência' },
    ],
    features: [
      {
        icon: CheckCircle2,
        title: 'Tudo da Equipe Interna',
        description:
          'Gestão de ativos, estoque, orçamento, conformidade PMOC, análise de custos, monitoramento IoT e IA integrada.',
      },
      {
        icon: Calculator,
        title: 'Orçamentos Profissionais',
        description:
          'Crie orçamentos detalhados em minutos com mão de obra, peças, deslocamento e envie por WhatsApp ou PDF.',
        highlight: true,
      },
      {
        icon: Route,
        title: 'Programação de Rotas',
        description:
          'Otimização de deslocamentos com algoritmos de roteirização, economia de combustível e aumento de produtividade.',
      },
      {
        icon: MapPin,
        title: 'Rastreamento de Equipe',
        description:
          'Localização em tempo real dos técnicos em campo com controle de jornada, privacidade e relatórios de deslocamento.',
      },
      {
        icon: FileCheck,
        title: 'Gestão de SLA',
        description:
          'Definição de prazos por cliente, alertas de vencimento e relatórios de cumprimento de acordo de nível de serviço.',
      },
      {
        icon: Users,
        title: 'Multi-cliente e Multi-contrato',
        description:
          'Organização de ativos, contratos e ordens de serviço separados por cliente com visões individualizadas.',
      },
      {
        icon: DollarSign,
        title: 'Controle Financeiro Integrado',
        description:
          'Faturamento automático baseado em OS concluídas, reconciliação de custos e margem de lucro por contrato.',
      },
      {
        icon: Smartphone,
        title: 'App Mobile Completo',
        description:
          'Técnicos acessam OS, atualizam status, registram fotos, assinam laudos e geram orçamentos direto do celular.',
      },
    ],
    highlights: [
      'Templates por tipo de serviço',
      'Catálogo de peças com preços',
      'Cálculo automático de margem',
      'Acompanhamento de aprovação',
    ],
    cta: {
      text: 'Conhecer Soluções para Prestadores',
      href: '/demo?persona=prestadores',
    },
  },
  {
    id: 'tecnico-autonomo',
    icon: Wrench,
    title: 'Técnico Autônomo',
    subtitle: 'Profissionalismo e agilidade',
    description:
      'Ferramentas essenciais para autônomos que precisam gerenciar clientes, criar orçamentos rapidamente e executar serviços com suporte de IA.',
    color: 'purple',
    modules: [
      { name: 'CMMS Essencial' },
      { name: 'App Mobile' },
      { name: 'Clima IA', badge: 'Diagnóstico' },
    ],
    features: [
      {
        icon: Users,
        title: 'Gestão de Clientes',
        description:
          'Histórico completo de cada cliente, equipamentos atendidos, contratos e agendamentos em um só lugar.',
      },
      {
        icon: Calculator,
        title: 'Orçamentos Instantâneos',
        description:
          'Gere orçamentos profissionais na hora, direto do celular, com itens, valores e condições de pagamento.',
        highlight: true,
      },
      {
        icon: ClipboardList,
        title: 'Execução de Ordens de Serviço',
        description:
          'Registre check-in, fotos antes/depois, peças utilizadas e finalize OS com assinatura digital do cliente.',
      },
      {
        icon: Bot,
        title: 'Chat IA para Diagnósticos',
        description:
          'Assistente inteligente que sugere causas e procedimentos a partir dos sintomas reportados.',
        highlight: true,
      },
      {
        icon: Thermometer,
        title: 'Calculadora PT Digital',
        description:
          'Tabela de pressão e temperatura para gases refrigerantes sempre atualizada na palma da mão.',
        highlight: true,
      },
      {
        icon: CalendarCheck,
        title: 'Agenda Inteligente',
        description:
          'Rotas, lembretes e redistribuição de atendimentos em tempo real.',
      },
      {
        icon: Receipt,
        title: 'Controle Financeiro',
        description:
          'Receitas, despesas e recibos profissionais integrados para controle do seu negócio.',
      },
      {
        icon: BookOpen,
        title: 'Biblioteca Técnica',
        description:
          'Manuais, procedimentos e checklists por equipamento para consulta rápida.',
      },
    ],
    highlights: [
      'Funciona 100% offline',
      'Sincroniza quando conectado',
      'Sem contrato longo',
      'Onboarding rápido',
    ],
    cta: {
      text: 'Começar como Técnico Autônomo',
      href: '/demo?persona=tecnico-autonomo',
    },
  },
]

const colorStyles = {
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-600 to-blue-500',
    border: 'border-blue-200 hover:border-blue-300',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    lightBg: 'bg-blue-50',
    darkText: 'text-blue-700',
  },
  green: {
    badge: 'bg-teal-100 text-teal-700',
    gradient: 'from-teal-600 to-teal-500',
    border: 'border-teal-200 hover:border-teal-300',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    lightBg: 'bg-teal-50',
    darkText: 'text-teal-700',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700',
    gradient: 'from-purple-600 to-purple-500',
    border: 'border-purple-200 hover:border-purple-300',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    lightBg: 'bg-purple-50',
    darkText: 'text-purple-700',
  },
}

// Dados do Chat IA (do TerceirosPage)
const aiChatExamples = [
  {
    question: 'O split liga mas não gela...',
    answer:
      'Possíveis causas: 1) falta de gás; 2) filtros sujos; 3) placa inversora com defeito; 4) sensor de temperatura com falha. Quer detalhar algum diagnóstico?',
  },
  {
    question: 'Qual pressão ideal para R410A a 7°C?',
    answer:
      'Para R410A com evaporação a 7°C, a pressão é cerca de 9.3 bar (135 psi). A condensação também influencia o ciclo.',
  },
]

// Dados da calculadora PT (do TerceirosPage)
const ptCalculatorGases = [
  { name: 'R22', pressure: '4.2 bar' },
  { name: 'R410A', pressure: '9.3 bar' },
  { name: 'R404A', pressure: '4.6 bar' },
  { name: 'R134a', pressure: '2.9 bar' },
  { name: 'R32', pressure: '7.8 bar' },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function MobileAppMockup() {
  return (
    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-[320px] mx-auto">
      <div className="bg-white rounded-[2.5rem] overflow-hidden">
        <div className="bg-teal-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold">ClimaTrak</div>
              <div className="text-sm text-teal-100">Olá, Carlos!</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-teal-100">Hoje</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-2xl font-bold">32</div>
              <div className="text-xs text-teal-100">Este mês</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-2xl font-bold">R$12k</div>
              <div className="text-xs text-teal-100">Faturado</div>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Próximo atendimento</div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Maria Santos</div>
                <div className="text-xs text-gray-500">Split 12000 BTUs - Não gela</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-teal-600">14:00</div>
                <div className="text-xs text-gray-400">2.3 km</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { icon: Calculator, label: 'Orçamento' },
              { icon: Bot, label: 'IA' },
              { icon: Thermometer, label: 'PT' },
              { icon: Users, label: 'Clientes' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-1">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AIChatMockup() {
  return (
    <div className="bg-gray-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-medium text-white">Assistente ClimaTrak</div>
          <div className="text-xs text-teal-400">Online - Powered by AI</div>
        </div>
      </div>
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {aiChatExamples.map((chat, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-teal-600 rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%]">
                <p className="text-sm text-white">{chat.question}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[85%]">
                <p className="text-sm text-gray-200">{chat.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Digite sua dúvida técnica..."
          className="flex-1 bg-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          readOnly
        />
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function PTCalculatorMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <Thermometer className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Calculadora PT</h3>
          <p className="text-sm text-gray-500">Pressão x Temperatura</p>
        </div>
      </div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gás refrigerante</label>
          <div className="flex flex-wrap gap-2">
            {['R22', 'R410A', 'R404A', 'R134a', 'R32'].map((gas, i) => (
              <button
                key={gas}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  i === 1 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {gas}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-purple-50 rounded-xl p-4">
        <div className="text-center mb-4">
          <div className="text-sm text-purple-600 mb-1">Pressão para R410A a 7°C</div>
          <div className="text-4xl font-bold text-purple-700">9.3 bar</div>
          <div className="text-lg text-purple-600">135 psi</div>
        </div>
        <div className="border-t border-purple-200 pt-4">
          <div className="text-xs text-purple-600 mb-2">Referência rápida:</div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {ptCalculatorGases.map((gas) => (
              <div key={gas.name} className="bg-white rounded-lg p-2">
                <div className="font-bold text-purple-700">{gas.name}</div>
                <div className="text-gray-500">{gas.pressure}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
      <div className="bg-teal-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-teal-100">Orçamento #2024-089</div>
            <div className="font-bold text-lg">Carlos Silva - HVAC</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-teal-100">Válido até</div>
            <div className="font-medium">15/01/2026</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Cliente</div>
          <div className="font-medium">Maria Santos</div>
          <div className="text-sm text-gray-500">Rua das Flores, 123 - Apt 45</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Equipamento</div>
          <div className="font-medium">Split Inverter 12000 BTUs - Samsung</div>
          <div className="text-sm text-gray-500">Problema: Não está gelando adequadamente</div>
        </div>
        <div className="border-t border-b py-4 my-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Serviços e peças</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mão de obra - Recarga de gás</span>
              <span className="font-medium">R$ 180,00</span>
            </div>
            <div className="flex justify-between">
              <span>Gás R410A (500g)</span>
              <span className="font-medium">R$ 120,00</span>
            </div>
            <div className="flex justify-between">
              <span>Limpeza completa</span>
              <span className="font-medium">R$ 150,00</span>
            </div>
            <div className="flex justify-between">
              <span>Deslocamento</span>
              <span className="font-medium">R$ 50,00</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-teal-600">R$ 500,00</div>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PersonasPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Soluções para Cada Perfil</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            ClimaTrak para{' '}
            <span className="text-gradient">todos os profissionais</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Do técnico autônomo às grandes empresas de manutenção: ferramentas poderosas,
            escaláveis e feitas sob medida para o seu modelo de negócio.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <a href="#equipe-interna">
                <Building2 className="mr-2 h-5 w-5" />
                Equipe Interna
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#prestadores">
                <Briefcase className="mr-2 h-5 w-5" />
                Prestadores
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#tecnico-autonomo">
                <Wrench className="mr-2 h-5 w-5" />
                Autônomo
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Personas Sections */}
      {personas.map((persona, index) => {
        const Icon = persona.icon
        const styles = colorStyles[persona.color]
        const isEven = index % 2 === 0

        return (
          <section
            key={persona.id}
            id={persona.id}
            className={cn('section-padding scroll-mt-20', !isEven && 'bg-muted/30')}
          >
            <div className="container-wide">
              {/* Section Header */}
              <div className="text-center mb-12">
                <div
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4',
                    styles.iconBg,
                    styles.darkText
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{persona.subtitle}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{persona.title}</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                  {persona.description}
                </p>

                {/* Modules */}
                <div className="flex flex-wrap justify-center gap-2">
                  {persona.modules.map((module) => (
                    <Badge key={module.name} variant="secondary" className={styles.badge}>
                      {module.name}
                      {module.badge && (
                        <span className="ml-1 text-xs opacity-70">• {module.badge}</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {persona.features.map((feature) => {
                  const FeatureIcon = feature.icon
                  return (
                    <Card
                      key={feature.title}
                      className={cn(
                        'card-hover relative overflow-hidden',
                        feature.highlight && `border-2 ${styles.border}`
                      )}
                    >
                      {feature.highlight && (
                        <div className="absolute top-0 right-0">
                          <Badge className={cn('rounded-none rounded-bl-lg', `bg-gradient-to-r ${styles.gradient} text-white`)}>
                            Destaque
                          </Badge>
                        </div>
                      )}
                      <CardContent className="pt-6">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                            feature.highlight ? styles.iconBg : 'bg-gray-100'
                          )}
                        >
                          <FeatureIcon
                            className={cn(
                              'w-6 h-6',
                              feature.highlight ? styles.iconColor : 'text-gray-600'
                            )}
                          />
                        </div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Visual Content per persona */}
              {persona.id === 'prestadores' && (
                <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
                  <div>
                    <Badge className={cn('mb-4', styles.badge)}>Profissionalismo</Badge>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                      Orçamentos que impressionam
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Gere orçamentos profissionais com fotos, peças e mão de obra. Envie direto
                      por WhatsApp ou PDF.
                    </p>
                    <div className="space-y-3">
                      {persona.highlights?.map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center',
                              styles.iconBg
                            )}
                          >
                            <Check className={cn('w-4 h-4', styles.iconColor)} />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <QuoteMockup />
                </div>
              )}

              {persona.id === 'tecnico-autonomo' && (
                <>
                  {/* App Mobile + Chat IA */}
                  <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
                    <div className="order-2 lg:order-1">
                      <MobileAppMockup />
                      {/* Floating badges */}
                      <div className="flex justify-center gap-4 mt-6">
                        <div className="bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-medium">IA disponível</span>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-teal-500" />
                          <span className="text-sm font-medium">+47% produtividade</span>
                        </div>
                      </div>
                    </div>
                    <div className="order-1 lg:order-2">
                      <Badge className={cn('mb-4', styles.badge)}>App Mobile</Badge>
                      <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                        Tudo na palma da mão
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Ferramentas profissionais para equipes terceiras e autônomos. Orçamentos em
                        minutos, diagnósticos com IA e controle financeiro.
                      </p>
                      <div className="space-y-3 mb-6">
                        {persona.highlights?.map((item) => (
                          <div key={item} className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                styles.iconBg
                              )}
                            >
                              <CheckCircle2 className={cn('w-4 h-4', styles.iconColor)} />
                            </div>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chat IA + Calculadora PT */}
                  <div className="py-16 bg-gray-900 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl mb-12">
                    <div className="max-w-6xl mx-auto">
                      <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                          <Badge className="mb-4 bg-purple-900 text-purple-300">
                            Inteligência Artificial
                          </Badge>
                          <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
                            Seu assistente técnico 24 horas
                          </h3>
                          <p className="text-gray-400 mb-6">
                            O Chat IA foi treinado com milhares de manuais técnicos e casos reais
                            de manutenção HVAC.
                          </p>
                          <div className="space-y-3">
                            {[
                              'Diagnóstico de problemas em equipamentos',
                              'Cálculos de carga térmica e dimensionamento',
                              'Tabelas de pressão e temperatura',
                              'Procedimentos de instalação e manutenção',
                            ].map((item) => (
                              <div key={item} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="text-gray-300">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <AIChatMockup />
                      </div>
                    </div>
                  </div>

                  {/* Calculadora PT */}
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <PTCalculatorMockup />
                    <div>
                      <Badge className={cn('mb-4', styles.badge)}>Ferramenta Essencial</Badge>
                      <h3 className="text-2xl sm:text-3xl font-bold mb-4">Régua PT Digital</h3>
                      <p className="text-muted-foreground mb-6">
                        Baseada na régua Danfoss, a calculadora digital traz tabelas de pressão e
                        temperatura para gases refrigerantes modernos. Sempre atualizada.
                      </p>
                      <div className="space-y-3">
                        {[
                          'Suporte a mais de 20 gases refrigerantes',
                          'Cálculo de superaquecimento e subresfriamento',
                          'Funciona 100% offline',
                          'Conversão automática bar/psi/kPa',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                styles.iconBg
                              )}
                            >
                              <Check className={cn('w-4 h-4', styles.iconColor)} />
                            </div>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Highlights for Equipe Interna */}
              {persona.id === 'equipe-interna' && persona.highlights && (
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <Badge className={cn('mb-4', styles.badge)}>Benefícios</Badge>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                      Por que escolher a ClimaTrak?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Uma plataforma única para manutenção, IoT e conformidade com resultados
                      comprovados.
                    </p>
                    <div className="space-y-3">
                      {persona.highlights.map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center',
                              styles.iconBg
                            )}
                          >
                            <Check className={cn('w-4 h-4', styles.iconColor)} />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: '40%', label: 'Redução em custos corretivos' },
                      { value: '99.9%', label: 'Disponibilidade da plataforma' },
                      { value: '+500', label: 'Ativos monitorados' },
                      { value: '24/7', label: 'Alertas e monitoramento' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={cn('p-6 rounded-xl text-center', styles.lightBg)}
                      >
                        <div className={cn('text-3xl font-bold mb-1', styles.darkText)}>
                          {stat.value}
                        </div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-12 text-center">
                <Button asChild size="lg" className={`bg-gradient-to-r ${styles.gradient} hover:opacity-90 text-white shadow-lg`}>
                  <Link to={persona.cta.href}>
                    {persona.cta.text}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )
      })}

      {/* Final CTA */}
      <section className="section-padding bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ainda tem dúvidas sobre qual solução é ideal?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração personalizada e conheça todas as funcionalidades em ação.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/demo">
                Agendar Demonstração
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link to="/precos">Ver Planos e Preços</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
