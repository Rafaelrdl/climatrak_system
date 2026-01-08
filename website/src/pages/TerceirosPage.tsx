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
    title: 'Orcamentos profissionais',
    description: 'Crie orcamentos detalhados em minutos com mao de obra, pecas e deslocamento.',
    highlight: true,
  },
  {
    icon: Bot,
    title: 'Chat IA para diagnosticos',
    description: 'Assistente inteligente que sugere causas e procedimentos a partir dos sintomas.',
    highlight: true,
  },
  {
    icon: Thermometer,
    title: 'Calculadora PT digital',
    description: 'Tabela de pressao e temperatura para gases refrigerantes atualizada.',
    highlight: true,
  },
  {
    icon: Users,
    title: 'Gestao de clientes e contratos',
    description: 'Historico completo de ativos, servicos e agendamentos por cliente.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda inteligente',
    description: 'Rotas, lembretes e redistribuicao de equipe em tempo real.',
  },
  {
    icon: Receipt,
    title: 'Controle financeiro',
    description: 'Receitas, despesas e recibos profissionais integrados.',
  },
  {
    icon: BookOpen,
    title: 'Biblioteca tecnica',
    description: 'Manuais, procedimentos e checklists por equipamento.',
  },
  {
    icon: Smartphone,
    title: 'App mobile offline',
    description: 'Trabalhe em campo e sincronize quando estiver conectado.',
  },
]

const aiFeatures = [
  {
    question: 'O split liga mas nao gela...',
    answer: 'Possiveis causas: 1) falta de gas; 2) filtros sujos; 3) placa inversora com defeito; 4) sensor de temperatura com falha. Quer detalhar algum diagnostico?',
  },
  {
    question: 'Qual pressao ideal para R410A a 7C?',
    answer: 'Para R410A com evaporacao a 7C, a pressao e cerca de 9.3 bar (135 psi). A condensaçao tambem influencia o ciclo.',
  },
  {
    question: 'Como dimensionar um split para sala de 40m2?',
    answer: 'Para 40m2, com pe-direito padrao, recomendo 24.000 BTUs. Em locais com alta carga termica, considere 30.000 BTUs.',
  },
]

const ptCalculatorGases = [
  { name: 'R22', temp: '7C', pressure: '4.2 bar', psi: '61 psi' },
  { name: 'R410A', temp: '7C', pressure: '9.3 bar', psi: '135 psi' },
  { name: 'R404A', temp: '-7C', pressure: '4.6 bar', psi: '67 psi' },
  { name: 'R134a', temp: '7C', pressure: '2.9 bar', psi: '42 psi' },
  { name: 'R32', temp: '7C', pressure: '7.8 bar', psi: '113 psi' },
]

const plans = [
  {
    name: 'Basico',
    price: 'Gratis',
    description: 'Para organizar a operacao inicial',
    features: [
      'Ate 10 clientes',
      'Agenda basica',
      'Calculadora PT',
      '5 orcamentos/mes',
      'App mobile',
    ],
    cta: 'Comecar gratis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 79',
    period: '/mes',
    description: 'Para equipes terceiras em crescimento',
    features: [
      'Clientes ilimitados',
      'Agenda com lembretes',
      'Calculadora PT completa',
      'Orcamentos ilimitados',
      'Chat IA (100 consultas/mes)',
      'Controle financeiro',
      'Biblioteca tecnica',
      'Suporte prioritario',
    ],
    cta: 'Assinar Pro',
    highlight: true,
  },
  {
    name: 'Equipe',
    price: 'R$ 159',
    period: '/mes',
    description: 'Para empresas terceiras e parceiros',
    features: [
      'Tudo do Pro',
      'Ate 5 tecnicos',
      'Chat IA ilimitado',
      'Relatorios avancados',
      'API para integracoes',
      'Marca propria nos orcamentos',
      'Treinamento incluso',
    ],
    cta: 'Falar com vendas',
    highlight: false,
  },
]

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Empresa terceirizada - SP',
    avatar: 'CS',
    text: 'Os orcamentos saem rapido e padronizados. Isso melhorou muito a aprovacao com clientes.',
  },
  {
    name: 'Roberto Almeida',
    role: 'Parceiro HVAC - RJ',
    avatar: 'RA',
    text: 'A calculadora PT digital virou item obrigatorio na equipe. Tudo na palma da mao.',
  },
  {
    name: 'Ana Costa',
    role: 'Coordenadora tecnica - MG',
    avatar: 'AC',
    text: 'O chat IA ajuda nos diagnósticos mais difíceis e economiza tempo em campo.',
  },
]

export function TerceirosPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-white to-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Para Terceiros</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Potencialize sua operacao de campo com a
                <span className="text-teal-600"> ClimaTrak</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Ferramentas profissionais para equipes terceiras e parceiros de HVAC. Orcamentos em minutos,
                diagnosticos com IA e controle financeiro na palma da mao.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contato">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Quero ser parceiro <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="#funcionalidades">
                  <Button size="lg" variant="outline">Ver funcionalidades</Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>Sem contrato longo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  <span>Onboarding rapido</span>
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
                        <div className="font-bold">ClimaTrak Terceiros</div>
                        <div className="text-sm text-teal-100">Ola, Carlos!</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-2xl font-bold">8</div>
                        <div className="text-xs text-teal-100">Hoje</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-2xl font-bold">32</div>
                        <div className="text-xs text-teal-100">Este mes</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="text-2xl font-bold">R$12k</div>
                        <div className="text-xs text-teal-100">Faturado</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Proximo atendimento</div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">Maria Santos</div>
                          <div className="text-xs text-gray-500">Split 12000 BTUs - Nao gela</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-teal-600">14:00</div>
                          <div className="text-xs text-gray-400">2.3 km</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {[
                        { icon: Calculator, label: 'Orcamento' },
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
                  <span className="text-sm font-medium">IA disponivel</span>
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
              Tudo que voce precisa para equipes terceiras
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Ferramentas criadas para padronizar atendimento, aumentar produtividade e melhorar a comunicacao com clientes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className={cn(
                'relative overflow-hidden transition-all hover:shadow-lg',
                benefit.highlight && 'border-teal-200 bg-teal-50/50'
              )}>
                {benefit.highlight && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-teal-600">Novo</Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    benefit.highlight ? 'bg-teal-100' : 'bg-gray-100'
                  )}>
                    <benefit.icon className={cn(
                      'w-6 h-6',
                      benefit.highlight ? 'text-teal-600' : 'text-gray-600'
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
              <Badge className="mb-4 bg-teal-900 text-teal-300">Inteligencia artificial</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Seu assistente tecnico 24 horas
              </h2>
              <p className="text-lg text-gray-400 mb-6">
                O Chat IA foi treinado com milhares de manuais tecnicos e casos reais de manutencao HVAC.
              </p>
              <div className="space-y-4">
                {[
                  'Diagnostico de problemas em equipamentos',
                  'Calculos de carga termica e dimensionamento',
                  'Tabelas de pressao e temperatura',
                  'Procedimentos de instalacao e manutencao',
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
                  <div className="text-xs text-teal-400">Online - Powered by AI</div>
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
                  placeholder="Digite sua duvida tecnica..."
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
                  <p className="text-sm text-gray-500">Pressao x temperatura</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gas refrigerante</label>
                  <div className="flex flex-wrap gap-2">
                    {['R22', 'R410A', 'R404A', 'R134a', 'R32', 'R407C'].map((gas, i) => (
                      <button
                        key={gas}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          i === 1 ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {gas}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temperatura (C)</label>
                    <input
                      type="number"
                      defaultValue="7"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option>Evaporacao</option>
                      <option>Condensacao</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 rounded-xl p-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-teal-600 mb-1">Pressao para R410A a 7C</div>
                  <div className="text-4xl font-bold text-teal-700">9.3 bar</div>
                  <div className="text-lg text-teal-600">135 psi</div>
                </div>

                <div className="border-t border-teal-200 pt-4">
                  <div className="text-xs text-teal-600 mb-2">Referencia rapida:</div>
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
              <Badge className="mb-4 bg-teal-100 text-teal-700">Ferramenta essencial</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Regua PT digital
              </h2>
              <p className="text-lg text-gray-500 mb-6">
                Baseada na regua Danfoss, a calculadora digital traz tabelas de pressao e temperatura
                para gases refrigerantes modernos. Sempre atualizada e na palma da mao.
              </p>
              <div className="space-y-4">
                {[
                  'Suporte a mais de 20 gases refrigerantes',
                  'Calculo de superaquecimento e subresfriamento',
                  'Funciona 100% offline',
                  'Tabelas sempre atualizadas',
                  'Conversao automatica bar/psi/kPa',
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
                Orcamentos que impressionam
              </h2>
              <p className="text-lg text-gray-500 mb-6">
                Gere orcamentos profissionais com fotos, pecas e mao de obra. Envie direto por WhatsApp.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Templates por tipo de servico',
                  'Catalogo de pecas com precos',
                  'Calculo automatico de margem',
                  'Envio por WhatsApp, e-mail ou PDF',
                  'Acompanhamento de aprovacao',
                  'Historico por cliente',
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
                    <div className="text-sm text-teal-100">Orcamento #2024-089</div>
                    <div className="font-bold text-lg">Carlos Silva - HVAC</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-teal-100">Valido ate</div>
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
                  <div className="text-sm text-gray-500">Problema: Nao esta gelando adequadamente</div>
                </div>

                <div className="border-t border-b py-4 my-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Servicos e pecas</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mao de obra - Recarga de gas</span>
                      <span className="font-medium">R$ 180,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas R410A (500g)</span>
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
              Terceiros que ja usam
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
              Escolha o plano ideal
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Comece gratis e evolua conforme sua equipe cresce.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name} className={cn(
                'relative overflow-hidden',
                plan.highlight && 'border-teal-500 border-2 shadow-lg'
              )}>
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 bg-teal-500 text-white text-center text-sm py-1 font-medium">
                    Mais popular
                  </div>
                )}
                <CardContent className={cn('pt-6', plan.highlight && 'pt-10')}>
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
                      'w-full',
                      plan.highlight ? 'bg-teal-600 hover:bg-teal-700' : ''
                    )}
                    variant={plan.highlight ? 'default' : 'outline'}
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
            Pronto para profissionalizar sua equipe?
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Junte-se a parceiros que ja usam a ClimaTrak para atender melhor e com mais controle.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contato">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Falar com vendas <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Ver demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
