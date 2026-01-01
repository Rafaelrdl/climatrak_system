import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Wrench, 
  Calculator, 
  MessageSquareText, 
  FileText, 
  Users, 
  Smartphone,
  Clock,
  TrendingUp,
  Star,
  Thermometer,
  BookOpen,
  Receipt,
  CalendarCheck,
  Sparkles,
  CheckCircle2,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const benefits = [
  {
    icon: Calculator,
    title: 'Geração de Orçamentos Profissionais',
    description: 'Crie orçamentos detalhados em minutos com cálculo automático de mão de obra, peças e deslocamento. Envie por WhatsApp ou e-mail direto para o cliente.',
    highlight: true,
  },
  {
    icon: Bot,
    title: 'Chat IA para Diagnósticos',
    description: 'Assistente inteligente que ajuda a diagnosticar problemas em equipamentos HVAC. Descreva os sintomas e receba sugestões de causas e soluções.',
    highlight: true,
  },
  {
    icon: Thermometer,
    title: 'Calculadora PT (Régua Digital)',
    description: 'Ferramenta digital tipo régua Danfoss para calcular pressão ideal de gases refrigerantes (R22, R410A, R404A, R134a e mais) baseado na temperatura.',
    highlight: true,
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastre seus clientes com histórico completo de equipamentos, serviços realizados e agendamentos futuros.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda Inteligente',
    description: 'Organize seus atendimentos com agenda visual, lembretes automáticos e otimização de rotas entre clientes.',
  },
  {
    icon: Receipt,
    title: 'Controle Financeiro',
    description: 'Acompanhe receitas, despesas, contas a receber e emita recibos profissionais para seus clientes.',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca Técnica',
    description: 'Acesso a manuais, tabelas de pressão, procedimentos e tutoriais para diversos modelos de equipamentos.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile Completo',
    description: 'Todas as funcionalidades na palma da mão. Funciona offline e sincroniza quando conectado.',
  },
]

const aiFeatures = [
  {
    question: 'O split está ligando mas não gela...',
    answer: 'Possíveis causas: 1) Falta de gás - verifique pressão. 2) Filtros sujos - limpe ou substitua. 3) Placa inversora com defeito. 4) Sensor de temperatura com falha. Quer que eu detalhe algum diagnóstico?',
  },
  {
    question: 'Qual pressão ideal para R410A a 7°C?',
    answer: 'Para R410A com temperatura de evaporação de 7°C, a pressão ideal é aproximadamente 9.3 bar (135 psi). Lembre-se que a temperatura de condensação também influencia no ciclo.',
  },
  {
    question: 'Como dimensionar um split para sala de 40m²?',
    answer: 'Para 40m², considerando pé-direito padrão (2.7m) e uso residencial, recomendo 24.000 BTUs. Se houver muita incidência solar ou equipamentos que geram calor, considere 30.000 BTUs.',
  },
]

const ptCalculatorGases = [
  { name: 'R22', temp: '7°C', pressure: '4.2 bar', psi: '61 psi' },
  { name: 'R410A', temp: '7°C', pressure: '9.3 bar', psi: '135 psi' },
  { name: 'R404A', temp: '-7°C', pressure: '4.6 bar', psi: '67 psi' },
  { name: 'R134a', temp: '7°C', pressure: '2.9 bar', psi: '42 psi' },
  { name: 'R32', temp: '7°C', pressure: '7.8 bar', psi: '113 psi' },
]

const plans = [
  {
    name: 'Starter',
    price: 'Grátis',
    description: 'Para começar a organizar seus serviços',
    features: [
      'Até 10 clientes',
      'Agenda básica',
      'Calculadora PT',
      '5 orçamentos/mês',
      'App mobile',
    ],
    cta: 'Começar Grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para técnicos que querem crescer',
    features: [
      'Clientes ilimitados',
      'Agenda com lembretes',
      'Calculadora PT completa',
      'Orçamentos ilimitados',
      'Chat IA (100 consultas/mês)',
      'Controle financeiro',
      'Biblioteca técnica',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para equipes e empresas',
    features: [
      'Tudo do Pro',
      'Até 5 técnicos',
      'Chat IA ilimitado',
      'Relatórios avançados',
      'API para integrações',
      'Marca própria nos orçamentos',
      'Treinamento incluído',
    ],
    cta: 'Falar com Vendas',
    highlight: false,
  },
]

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Técnico Autônomo - SP',
    avatar: 'CS',
    text: 'O gerador de orçamentos me economiza pelo menos 1 hora por dia. Agora consigo atender mais clientes e passar uma imagem muito mais profissional.',
  },
  {
    name: 'Roberto Almeida',
    role: 'Técnico em Refrigeração - RJ',
    avatar: 'RA',
    text: 'A calculadora de pressão é sensacional! Não preciso mais carregar a régua física e tenho todos os gases na palma da mão.',
  },
  {
    name: 'Ana Costa',
    role: 'Técnica HVAC - MG',
    avatar: 'AC',
    text: 'O chat de IA já me salvou várias vezes em diagnósticos difíceis. É como ter um colega experiente disponível 24h.',
  },
]

export function TechnicianPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-white to-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Para Técnicos Autônomos</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Seu negócio de manutenção HVAC no{' '}
                <span className="text-teal-600">próximo nível</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Ferramentas profissionais para técnicos em refrigeração e climatização. 
                Orçamentos em minutos, diagnósticos com IA e calculadoras técnicas na palma da mão.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/cadastro-tecnico">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Começar Grátis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="#funcionalidades">
                  <Button size="lg" variant="outline">Ver Funcionalidades</Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </div>
            
            {/* Hero Mockup - App Preview */}
            <div className="relative">
              <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-[320px] mx-auto">
                <div className="bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="bg-teal-600 px-6 py-8 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold">ClimaTrak Técnico</div>
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
              
              {/* Floating badges */}
              <div className="absolute -left-4 top-20 bg-white rounded-xl shadow-lg p-3 hidden lg:block">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium">IA Disponível</span>
                </div>
              </div>
              <div className="absolute -right-4 bottom-32 bg-white rounded-xl shadow-lg p-3 hidden lg:block">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-medium">+47% produtividade</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para trabalhar melhor
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Ferramentas desenvolvidas por técnicos, para técnicos. Simplifique seu dia a dia 
              e impressione seus clientes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                benefit.highlight && "border-teal-200 bg-teal-50/50"
              )}>
                {benefit.highlight && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-teal-600">Novo</Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    benefit.highlight ? "bg-teal-100" : "bg-gray-100"
                  )}>
                    <benefit.icon className={cn(
                      "w-6 h-6",
                      benefit.highlight ? "text-teal-600" : "text-gray-600"
                    )} />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-500">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat Feature */}
      <section className="py-16 md:py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-900 text-teal-300">Inteligência Artificial</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Seu assistente técnico 24 horas
              </h2>
              <p className="text-lg text-gray-400 mb-6">
                O Chat IA foi treinado com milhares de manuais técnicos, casos de manutenção 
                e conhecimento especializado em HVAC. Pergunte qualquer coisa!
              </p>
              <div className="space-y-4">
                {[
                  'Diagnóstico de problemas em equipamentos',
                  'Cálculos de carga térmica e dimensionamento',
                  'Tabelas de pressão e temperatura',
                  'Procedimentos de instalação e manutenção',
                  'Dicas de troubleshooting',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-teal-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat Mockup */}
            <div className="bg-gray-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium">Assistente ClimaTrak</div>
                  <div className="text-xs text-teal-400">Online • Powered by AI</div>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {aiFeatures.map((chat, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-end">
                      <div className="bg-teal-600 rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                        <p className="text-sm">{chat.question}</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%]">
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
                />
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PT Calculator Feature */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Calculator Mockup */}
            <div className="bg-white rounded-2xl shadow-xl border p-6 order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Thermometer className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Calculadora PT</h3>
                  <p className="text-sm text-gray-500">Pressão × Temperatura</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gás Refrigerante</label>
                  <div className="flex flex-wrap gap-2">
                    {['R22', 'R410A', 'R404A', 'R134a', 'R32', 'R407C'].map((gas, i) => (
                      <button 
                        key={gas}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                          i === 1 ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {gas}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temperatura (°C)</label>
                    <input 
                      type="number" 
                      defaultValue="7" 
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>Evaporação</option>
                      <option>Condensação</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-teal-50 rounded-xl p-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-teal-600 mb-1">Pressão para R410A a 7°C</div>
                  <div className="text-4xl font-bold text-teal-700">9.3 bar</div>
                  <div className="text-lg text-teal-600">135 psi</div>
                </div>
                
                <div className="border-t border-teal-200 pt-4">
                  <div className="text-xs text-teal-600 mb-2">Referência rápida:</div>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {ptCalculatorGases.map((gas) => (
                      <div key={gas.name} className="bg-white rounded-lg p-2">
                        <div className="font-bold text-teal-700">{gas.name}</div>
                        <div className="text-gray-500">{gas.pressure}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <Badge className="mb-4 bg-teal-100 text-teal-700">Ferramenta Essencial</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Régua PT Digital
              </h2>
              <p className="text-lg text-gray-500 mb-6">
                Baseada na clássica régua Danfoss, nossa calculadora digital traz tabelas de 
                pressão × temperatura para todos os gases refrigerantes modernos. 
                Sempre atualizada e na palma da mão.
              </p>
              <div className="space-y-4">
                {[
                  'Suporte a mais de 20 gases refrigerantes',
                  'Cálculo de superaquecimento e subresfriamento',
                  'Funciona 100% offline',
                  'Tabelas sempre atualizadas',
                  'Conversão automática bar/psi/kPa',
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
          </div>
        </div>
      </section>

      {/* Quote Generator Feature */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Profissionalismo</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Orçamentos que impressionam
              </h2>
              <p className="text-lg text-gray-500 mb-6">
                Crie orçamentos profissionais em menos de 2 minutos. Inclua fotos do problema, 
                detalhamento de peças e mão de obra, e envie direto pelo WhatsApp.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Templates prontos por tipo de serviço',
                  'Catálogo de peças com preços',
                  'Cálculo automático de margem',
                  'Envio por WhatsApp, E-mail ou PDF',
                  'Acompanhamento de aprovação',
                  'Histórico de orçamentos por cliente',
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
            
            {/* Quote Mockup */}
            <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
              <div className="bg-teal-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-teal-100">Orçamento #2024-089</div>
                    <div className="font-bold text-lg">Carlos Silva - Refrigeração</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-teal-100">Válido até</div>
                    <div className="font-medium">15/01/2025</div>
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
                  <div className="text-sm font-medium text-gray-700 mb-3">Serviços e Peças</div>
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
                      <span>Limpeza completa do equipamento</span>
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
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Técnicos que já usam
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-teal-700">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="font-medium">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Planos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Comece grátis e faça upgrade quando precisar de mais recursos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name} className={cn(
                "relative overflow-hidden",
                plan.highlight && "border-teal-500 border-2 shadow-lg"
              )}>
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-teal-500 text-white text-center text-sm py-1 font-medium">
                    Mais Popular
                  </div>
                )}
                <CardContent className={cn("pt-6", plan.highlight && "pt-10")}>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-gray-500">{plan.period}</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className={cn(
                      "w-full",
                      plan.highlight ? "bg-teal-600 hover:bg-teal-700" : ""
                    )}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para profissionalizar seu trabalho?
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de técnicos que já estão usando o ClimaTrak para 
            trabalhar melhor e ganhar mais.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/cadastro-tecnico">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Criar Conta Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Ver Demonstração
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
