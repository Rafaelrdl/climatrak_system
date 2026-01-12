import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  MessageSquare,
  Smartphone,
  Wifi,
  WifiOff,
  Check,
  Users,
  Star,
  Send,
  Target,
  Play,
  Camera,
  Receipt,
} from 'lucide-react'

// ============================================================================
// DATA
// ============================================================================

const heroStats = [
  { value: '3x', label: 'Mais orçamentos por dia' },
  { value: '-60%', label: 'Tempo administrativo' },
  { value: 'R$ 2k', label: 'A mais por mês' },
  { value: 'Grátis', label: 'Para começar' },
]

const painPoints = [
  {
    icon: Clock,
    problem: 'Perdendo tempo com papel',
    description: 'Anotar em caderno, passar pro WhatsApp depois. Horas perdidas.',
    cost: '10h/semana em burocracia',
  },
  {
    icon: Calculator,
    problem: 'Cálculos de cabeça',
    description: 'Cliente pergunta BTU e você chuta. Passa vergonha ou perde serviço.',
    cost: '2 serviços perdidos/mês',
  },
  {
    icon: WifiOff,
    problem: 'Sem internet = sem app',
    description: 'Apps que não funcionam offline são inúteis no porão do prédio.',
    cost: 'Frustração toda semana',
  },
]

const mainFeatures = [
  {
    icon: Smartphone,
    title: 'App Mobile First',
    description:
      'Projetado para quem trabalha sozinho. Tudo na palma da mão: clientes, OS, orçamentos, fotos e financeiro.',
    benefits: ['Interface simples', 'Uma mão só', 'Notificações', 'Widget home'],
    result: 'Tudo em um lugar só',
  },
  {
    icon: Bot,
    title: 'Clima IA - Seu Assistente',
    description:
      'Não sabe o código de erro? Pergunta pra IA. Dúvida em cálculo de BTU? A IA resolve. É como ter um colega experiente 24h.',
    benefits: ['Códigos de erro', 'Cálculos técnicos', 'Diagnóstico', 'Manuais'],
    result: 'Nunca mais fique perdido',
  },
  {
    icon: Calculator,
    title: 'Calculadora de Potência',
    description:
      'Calcule BTUs em segundos considerando área, orientação solar, pessoas e equipamentos. Gere PDF para o cliente.',
    benefits: ['BTU preciso', 'Relatório PDF', 'Sem internet', 'Compartilha fácil'],
    result: 'Impressione o cliente na hora',
  },
  {
    icon: WifiOff,
    title: '100% Offline',
    description:
      'Abriu OS, registrou foto, gerou orçamento — tudo funciona sem internet. Sincroniza quando voltar a conectar.',
    benefits: ['Zero dependência', 'Sync automático', 'Sem perda', 'Áreas rurais'],
    result: 'Funciona até no porão do prédio',
  },
  {
    icon: Receipt,
    title: 'Orçamentos Instantâneos',
    description:
      'Monte orçamentos profissionais na hora com templates prontos. Envie por WhatsApp e receba aprovação mais rápido.',
    benefits: ['Templates', 'WhatsApp direto', 'PDF bonito', 'Histórico'],
    result: '3x mais aprovações',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description:
      'Cadastro simples de clientes com histórico de atendimentos, equipamentos e orçamentos. Tudo organizado.',
    benefits: ['CRM básico', 'Histórico', 'Equipamentos', 'Lembretes'],
    result: 'Cliente lembra de você',
  },
]

const aiExamples = [
  {
    question: 'Split LG 12000 BTUs não liga, LED verde piscando 3 vezes',
    answer:
      'Código de erro E3 - Problema no sensor de temperatura do evaporador. Verifique conexão do sensor ou substitua se danificado. Custo médio peça: R$ 45-80.',
  },
  {
    question: 'Como calcular carga térmica pra sala de 25m² com 4 computadores?',
    answer:
      'Cálculo: 25m² × 600 BTU = 15.000 BTU (base) + 4 PCs × 400 BTU = 1.600 BTU. Total: ~17.000 BTU. Recomendo Split 18.000 BTU inverter para eficiência.',
  },
  {
    question: 'Diferença entre R22 e R410A na pressão de trabalho?',
    answer:
      'R22: Alta ~18 bar, Baixa ~5 bar. R410A: Alta ~26 bar, Baixa ~8 bar. O R410A trabalha com pressões ~50% maiores. Use manômetros específicos!',
  },
]

const offlineCapabilities = [
  'Abrir e fechar OS',
  'Registrar fotos com timestamp',
  'Gerar orçamentos completos',
  'Consultar histórico de clientes',
  'Calcular BTU e carga térmica',
  'Consultar base de códigos de erro',
  'Registrar pagamentos recebidos',
  'Scanner de QR Code de equipamentos',
]

const testimonials = [
  {
    name: 'Marcelo Santos',
    role: 'Técnico autônomo há 5 anos - GO',
    avatar: 'MS',
    text: 'A IA me salva todo dia. Antes perdia 30 min procurando código de erro. Agora pergunto e ela responde na hora.',
    metric: '-30 min/atendimento',
  },
  {
    name: 'Paulo Ribeiro',
    role: 'Autônomo em área rural - BA',
    avatar: 'PR',
    text: 'Trabalho em fazendas sem sinal. O app funciona offline perfeitamente. Sincroniza quando chego na cidade.',
    metric: '100% offline',
  },
  {
    name: 'Diego Ferreira',
    role: 'Ex-funcionário, agora autônomo - PR',
    avatar: 'DF',
    text: 'Comecei no plano grátis. Em 2 meses já estava no Pro. A calculadora de BTU impressiona os clientes. Fecho mais.',
    metric: 'R$ 2k a mais/mês',
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function MobileAppMockup() {
  return (
    <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-[320px] mx-auto">
      <div className="bg-white rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold">M</span>
              </div>
              <div>
                <div className="font-bold">Olá, Marcelo!</div>
                <div className="text-sm text-purple-200">Técnico autônomo</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">5</div>
              <div className="text-xs text-purple-200">Hoje</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">R$ 2,4k</div>
              <div className="text-xs text-purple-200">Semana</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs text-purple-200">Clientes</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { icon: ClipboardList, label: 'Nova OS', color: 'bg-purple-100 text-purple-600' },
              { icon: Calculator, label: 'Calc BTU', color: 'bg-blue-100 text-blue-600' },
              { icon: Receipt, label: 'Orçam.', color: 'bg-green-100 text-green-600' },
              { icon: Bot, label: 'Clima IA', color: 'bg-amber-100 text-amber-600' },
            ].map((action) => (
              <div key={action.label} className="text-center">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-1',
                    action.color
                  )}
                >
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-600">{action.label}</span>
              </div>
            ))}
          </div>

          {/* Current job */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-purple-600 text-white text-[10px]">Em andamento</Badge>
              <span className="text-xs text-gray-500">14:30</span>
            </div>
            <div className="font-medium text-sm">Maria Silva</div>
            <div className="text-xs text-gray-500 mb-2">Split 12000 - Não gela</div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700">
                Finalizar
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Camera className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Next jobs */}
          <div className="text-xs font-medium text-gray-700 mb-2">Próximos atendimentos</div>
          <div className="space-y-2">
            {[
              { name: 'João Costa', time: '16:00', type: 'Instalação' },
              { name: 'Ana Pereira', time: '18:00', type: 'Preventiva' },
            ].map((job, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{job.name}</div>
                  <div className="text-xs text-gray-500">{job.type}</div>
                </div>
                <span className="text-xs font-medium text-purple-600">{job.time}</span>
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
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden max-w-md">
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold">Clima IA</div>
            <div className="text-sm text-purple-200">Seu assistente técnico 24h</div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4 h-80 overflow-y-auto bg-gray-50">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-[80%]">
            <p className="text-sm">{aiExamples[0].question}</p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex justify-start">
          <div className="bg-white shadow-sm border rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-700">{aiExamples[0].answer}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-[10px]">
                Manual LG
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Vídeo reparo
              </Badge>
            </div>
          </div>
        </div>
        {/* User message 2 */}
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-[80%]">
            <p className="text-sm">{aiExamples[1].question}</p>
          </div>
        </div>
        {/* AI response 2 */}
        <div className="flex justify-start">
          <div className="bg-white shadow-sm border rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
            <p className="text-sm text-gray-700">{aiExamples[1].answer}</p>
          </div>
        </div>
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Digite sua dúvida técnica..."
            className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Button size="icon" className="rounded-full bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PTCalculatorMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold">Calculadora de Potência</div>
            <div className="text-sm text-blue-100">Dimensionamento preciso</div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Área (m²)</label>
            <div className="bg-gray-100 rounded-lg px-3 py-2 font-medium">25</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Pessoas</label>
            <div className="bg-gray-100 rounded-lg px-3 py-2 font-medium">4</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Orientação</label>
            <div className="bg-gray-100 rounded-lg px-3 py-2 font-medium">Oeste</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Equipamentos</label>
            <div className="bg-gray-100 rounded-lg px-3 py-2 font-medium">2 PCs</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-4">
          <div className="text-sm text-gray-600 mb-1">Potência recomendada</div>
          <div className="text-4xl font-bold text-purple-600 mb-1">18.000 BTU</div>
          <div className="text-sm text-gray-500">Carga calculada: 16.800 BTU (+7% margem)</div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Carga térmica base</span>
            <span className="font-medium">15.000 BTU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">+ Ocupação (4 pessoas)</span>
            <span className="font-medium">600 BTU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">+ Equipamentos</span>
            <span className="font-medium">800 BTU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">+ Orientação solar</span>
            <span className="font-medium">400 BTU</span>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
            <FileText className="w-4 h-4 mr-2" /> Gerar PDF
          </Button>
          <Button variant="outline">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuoteMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-green-100">Orçamento rápido</div>
            <div className="font-bold">Maria Silva</div>
          </div>
          <Badge className="bg-white/20 text-white">Novo</Badge>
        </div>
      </div>
      <div className="p-5">
        <div className="text-sm text-gray-500 mb-2">Serviço</div>
        <div className="font-medium mb-4">Limpeza + Recarga de gás R410A</div>

        <div className="space-y-2 border-b pb-4 mb-4">
          <div className="flex justify-between text-sm">
            <span>Limpeza completa</span>
            <span className="font-medium">R$ 180,00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Recarga gás (600g)</span>
            <span className="font-medium">R$ 220,00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Deslocamento</span>
            <span className="font-medium">R$ 50,00</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold text-green-600">R$ 450,00</span>
        </div>

        <Button className="w-full bg-green-600 hover:bg-green-700">
          <MessageSquare className="w-4 h-4 mr-2" /> Enviar via WhatsApp
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TecnicoAutonomoPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-purple-50 via-white to-purple-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-100 text-purple-700">Para Técnico Autônomo</Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Trabalhe <span className="text-purple-600">mais inteligente</span>, não mais duro
              </h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-xl">
                Você é bom no que faz. 
                <strong className="text-foreground"> Mas perder tempo com papel e cálculo de cabeça te atrasa.</strong>
              </p>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                App que funciona offline, IA que tira dúvidas, calculadora de BTU que impressiona 
                e orçamentos via WhatsApp em segundos. <strong className="text-purple-600">Comece grátis.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button asChild size="xl" className="bg-purple-600 hover:bg-purple-700">
                  <Link to="/demo?persona=autonomo">
                    Começar grátis agora
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
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>Grátis para sempre</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>100% offline</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <MobileAppMockup />
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">IA disponível 24h</span>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Funciona sem internet</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-purple-600 text-white">
        <div className="container-wide">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-purple-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="section-padding bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-100 text-red-700">Você vive isso todo dia?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ser autônomo não deveria ser tão difícil
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
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que um técnico autônomo precisa
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido por quem entende a rotina de quem trabalha sozinho.
              Simples, rápido e funciona até no meio do mato.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="card-hover border-2 hover:border-purple-200">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {feature.benefits.map((benefit) => (
                        <Badge key={benefit} variant="secondary" className="bg-purple-50 text-purple-700">
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

      {/* AI Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-100 text-purple-700">Clima IA</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Um colega experiente no seu bolso
              </h2>
              <p className="text-muted-foreground mb-6">
                Pergunte qualquer coisa sobre HVAC: códigos de erro, cálculos de carga
                térmica, diferenças entre gases, procedimentos de instalação. A IA responde
                na hora.
              </p>

              <div className="space-y-4">
                {aiExamples.slice(1).map((example, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3 mb-2">
                        <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{example.question}</p>
                      </div>
                      <div className="flex items-start gap-3 pl-8">
                        <p className="text-sm text-muted-foreground">{example.answer}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <AIChatMockup />
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <PTCalculatorMockup />
            </div>
            <div className="order-1 lg:order-2">
              <Badge className="mb-4 bg-blue-100 text-blue-700">Calculadora de BTU</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Dimensionamento profissional em segundos
              </h2>
              <p className="text-muted-foreground mb-6">
                Calcule a potência ideal considerando área, orientação solar, quantidade
                de pessoas e equipamentos. Gere um relatório PDF para impressionar seu cliente.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Target, title: 'Precisão', desc: 'Cálculo técnico completo' },
                  { icon: FileText, title: 'Relatório PDF', desc: 'Profissional e bonito' },
                  { icon: WifiOff, title: 'Offline', desc: 'Funciona sem internet' },
                  { icon: MessageSquare, title: 'Compartilha', desc: 'WhatsApp ou e-mail' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-600" />
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

      {/* Offline Section */}
      <section className="section-padding bg-gray-900 text-white">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-900 text-purple-300">100% Offline</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Funciona até onde não pega sinal
              </h2>
              <p className="text-lg text-gray-400 mb-6">
                Sabemos que técnico trabalha em todo lugar: porão de prédio, área rural,
                subsolo de shopping. O app foi feito para funcionar sem internet.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {offlineCapabilities.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 bg-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-purple-300 mb-2">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Sincronização inteligente</span>
                </div>
                <p className="text-sm text-gray-400">
                  Quando voltar a ter conexão, o app sincroniza automaticamente em background.
                  Você nem percebe.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-800 rounded-3xl p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <WifiOff className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold mb-2">Modo Offline Ativo</div>
                  <div className="text-gray-400">Todas as funções disponíveis</div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { icon: ClipboardList, label: 'OS' },
                    { icon: Receipt, label: 'Orçam.' },
                    { icon: Calculator, label: 'BTU' },
                    { icon: Camera, label: 'Fotos' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-1">
                        <item.icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700">Orçamentos</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Orçamentos profissionais em 1 minuto
              </h2>
              <p className="text-muted-foreground mb-6">
                Use templates prontos, adicione serviços e peças, e envie direto pro
                WhatsApp do cliente. Acompanhe se ele visualizou e foi aprovado.
              </p>
              <div className="space-y-3">
                {[
                  'Templates por tipo de serviço',
                  'Catálogo de peças e serviços',
                  'Envio via WhatsApp ou PDF',
                  'Histórico de orçamentos por cliente',
                  'Conversão em OS quando aprovado',
                  'Controle de pagamentos',
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
            <QuoteMockup />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Técnicos que já usam
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-purple-700">{testimonial.avatar}</span>
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

      {/* Pricing Teaser */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Planos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Comece grátis, evolua quando precisar
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: 'Grátis',
                price: 'R$ 0',
                desc: 'Para quem está começando',
                features: ['Até 10 clientes', '20 OS/mês', 'Calculadora BTU', 'Orçamentos básicos'],
                highlight: false,
              },
              {
                name: 'Pro',
                price: 'R$ 49',
                desc: 'Para quem quer crescer',
                features: ['Clientes ilimitados', 'OS ilimitadas', 'Clima IA completa', 'Relatórios'],
                highlight: true,
              },
              {
                name: 'Business',
                price: 'R$ 99',
                desc: 'Para quem quer mais',
                features: ['Tudo do Pro', 'Multi-técnico', 'Agenda compartilhada', 'API integração'],
                highlight: false,
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  'relative',
                  plan.highlight && 'border-purple-500 border-2 shadow-lg'
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white">Mais popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {plan.price}
                      {plan.price !== 'R$ 0' && <span className="text-sm font-normal text-gray-500">/mês</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-purple-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={cn(
                      'w-full',
                      plan.highlight ? 'bg-purple-600 hover:bg-purple-700' : ''
                    )}
                    variant={plan.highlight ? 'default' : 'outline'}
                  >
                    {plan.price === 'R$ 0' ? 'Começar grátis' : 'Assinar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-to-r from-purple-600 to-purple-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Quantos serviços você perde por não ter as ferramentas certas?
          </h2>
          <p className="text-lg text-purple-100 mb-4 max-w-2xl mx-auto">
            Nossos usuários relatam ganhar em média <strong className="text-white">R$ 2 mil a mais por mês</strong> ao 
            economizar tempo com burocracia e fechar mais orçamentos.
          </p>
          <p className="text-purple-200 mb-8">
            E você pode começar <strong className="text-white">100% grátis</strong>. Sem cartão, sem compromisso.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              <Link to="/demo?persona=autonomo">
                Começar grátis agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link to="/precos">Ver planos Pro</Link>
            </Button>
          </div>
          <p className="text-sm text-purple-200 mt-6">
            ✓ Sem cartão de crédito &nbsp;|&nbsp; ✓ Funciona offline &nbsp;|&nbsp; ✓ Suporte via WhatsApp
          </p>
        </div>
      </section>
    </div>
  )
}
