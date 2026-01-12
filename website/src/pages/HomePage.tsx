import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Activity,
  Shield,
  TrendingDown,
  Building2,
  Factory,
  Hospital,
  CheckCircle2,
  Zap,
  BarChart3,
  Bell,
  FileText,
  AlertTriangle,
  DollarSign,
  Users,
  Play,
  Star,
  Quote,
} from 'lucide-react'

// ============================================================================
// DATA - Otimizado para conversão
// ============================================================================

const painPoints = [
  {
    icon: AlertTriangle,
    problem: 'Paradas inesperadas custando milhares',
    solution: 'Alertas preditivos 24h antes da falha',
  },
  {
    icon: FileText,
    problem: 'Horas perdidas montando relatórios PMOC',
    solution: 'Laudos gerados automaticamente em 1 clique',
  },
  {
    icon: DollarSign,
    problem: 'Custos de manutenção fora de controle',
    solution: 'Visão em tempo real de gastos por ativo',
  },
  {
    icon: Users,
    problem: 'Equipe apagando incêndio o tempo todo',
    solution: 'Planos preventivos com OS automáticas',
  },
]

const products = [
  {
    name: 'TrakNor',
    subtitle: 'CMMS',
    description: 'Gestão completa de manutenção: OS, planos, ativos e equipes em uma plataforma.',
    color: 'from-teal-600 to-teal-400',
    href: '/produtos/traknor',
    highlight: 'Mais usado',
  },
  {
    name: 'TrakSense',
    subtitle: 'IoT',
    description: 'Monitoramento 24/7 com alertas que salvam equipamentos antes de falharem.',
    color: 'from-blue-600 to-cyan-400',
    href: '/produtos/traksense',
    highlight: 'Preditivo',
  },
  {
    name: 'TrakLedger',
    subtitle: 'Finance',
    description: 'Controle financeiro conectado a cada OS. Saiba exatamente onde está o dinheiro.',
    color: 'from-emerald-600 to-emerald-400',
    href: '/produtos/trakledger',
    highlight: 'ROI claro',
  },
  {
    name: 'TrakService',
    subtitle: 'Field',
    description: 'Equipe externa sob controle: rotas, orçamentos e rastreamento em tempo real.',
    color: 'from-orange-600 to-orange-400',
    href: '/produtos/trakservice',
    highlight: 'Novo',
  },
]

const segments = [
  {
    icon: Hospital,
    name: 'Hospitais',
    stat: '100%',
    statLabel: 'PMOC em dia',
    description: 'Conformidade total em áreas críticas.',
    href: '/solucoes#hospitais',
  },
  {
    icon: Factory,
    name: 'Indústrias',
    stat: '-60%',
    statLabel: 'Corretivas',
    description: 'Menos paradas, mais produção.',
    href: '/solucoes#industrias',
  },
  {
    icon: Building2,
    name: 'Facilities',
    stat: '50+',
    statLabel: 'Sites em 1 tela',
    description: 'Visão consolidada multi-site.',
    href: '/solucoes#facilities',
  },
]

const stats = [
  { value: 'R$ 2.4M', label: 'Economizados por clientes em 2025', icon: DollarSign },
  { value: '-47%', label: 'Redução em corretivas', icon: TrendingDown },
  { value: '< 2min', label: 'Tempo médio de alerta', icon: Bell },
  { value: '99.9%', label: 'Uptime da plataforma', icon: Activity },
]

const testimonials = [
  {
    name: 'Dr. Ricardo Mendes',
    role: 'Diretor Técnico',
    company: 'Hospital São Lucas',
    avatar: 'RM',
    text: 'Passamos na auditoria da Vigilância sem nenhuma pendência. Todos os laudos PMOC estavam prontos automaticamente.',
    result: '100% conformidade PMOC',
  },
  {
    name: 'Eng. Paulo Ferreira',
    role: 'Gerente de Manutenção',
    company: 'Indústria Alimentícia',
    avatar: 'PF',
    text: 'Reduzimos 60% das paradas não planejadas no primeiro ano. O ROI veio em 4 meses.',
    result: 'ROI em 4 meses',
  },
  {
    name: 'Fernanda Lima',
    role: 'Coord. Facilities',
    company: 'Rede de Shoppings',
    avatar: 'FL',
    text: 'Antes eu gastava 2 dias consolidando relatórios. Agora é automático e tenho tempo para o que importa.',
    result: '-90% tempo em relatórios',
  },
]

const trustedBy = [
  'Hospital Regional', 'Indústria Alimentícia XYZ', 'Shopping Center ABC',
  'Clínica São Lucas', 'Data Center TechCorp', 'Rede Facilities Premium'
]

// ============================================================================
// COMPONENTS
// ============================================================================

function HeroDashboardMockup() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">ClimaTrak Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/80 text-xs">Online</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 bg-gray-50">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'OS Abertas', value: '12', color: 'text-amber-600', trend: '-3' },
            { label: 'Ativos OK', value: '98%', color: 'text-green-600', trend: '+2%' },
            { label: 'MTTR', value: '4.2h', color: 'text-blue-600', trend: '-12%' },
            { label: 'Alertas', value: '0', color: 'text-green-600', trend: '✓' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg p-2 border shadow-sm">
              <div className="text-[10px] text-gray-500">{stat.label}</div>
              <div className={cn('text-lg font-bold', stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-green-600">{stat.trend}</div>
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div className="bg-white rounded-lg p-3 border shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Manutenções - Últimos 7 dias</span>
            <Badge variant="secondary" className="text-[10px] h-5">Preventiva +45%</Badge>
          </div>
          <div className="flex items-end gap-1 h-20">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={cn('w-full rounded-t', i === 5 ? 'bg-teal-500' : 'bg-teal-300')}
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Alert */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700">Todos os ativos críticos operando normalmente</span>
        </div>
      </div>
    </div>
  )
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <Quote className="w-8 h-8 text-teal-200 mb-2" />
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">"{testimonial.text}"</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">
              {testimonial.avatar}
            </div>
            <div>
              <div className="font-semibold text-sm">{testimonial.name}</div>
              <div className="text-xs text-muted-foreground">{testimonial.role}</div>
              <div className="text-xs text-muted-foreground">{testimonial.company}</div>
            </div>
          </div>
          <Badge className="bg-teal-100 text-teal-700 text-xs">{testimonial.result}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PAGE
// ============================================================================

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Foco no problema/solução */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">
                +200 empresas já transformaram sua operação
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Pare de apagar incêndios.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
                  Preveja e previna.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                A ClimaTrak transforma a gestão de ativos HVAC: menos corretivas, laudos PMOC automáticos 
                e visibilidade total de custos. <strong>Tudo integrado em uma plataforma.</strong>
              </p>
              
              {/* Social proof inline */}
              <div className="flex items-center gap-4 mb-8 flex-wrap">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">4.9/5 de 50+ avaliações</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-base px-8">
                    Agendar demonstração gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/produtos">
                  <Button size="lg" variant="outline" className="text-base">
                    <Play className="mr-2 h-4 w-4" />
                    Ver plataforma em ação
                  </Button>
                </Link>
              </div>
              
              {/* Trust indicators */}
              <p className="mt-6 text-sm text-muted-foreground">
                ✓ Setup em 7 dias &nbsp;&nbsp; ✓ Sem contrato de fidelidade &nbsp;&nbsp; ✓ Suporte dedicado
              </p>
            </div>
            
            <div className="relative">
              <HeroDashboardMockup />
              
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 animate-float border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-green-600">-47%</div>
                    <div className="text-xs text-gray-500">Corretivas</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 animate-float border" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-teal-600">100%</div>
                    <div className="text-xs text-gray-500">PMOC em dia</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Impacto real */}
      <section className="py-12 bg-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-teal-200" />
                <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-teal-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-100 text-red-700">Reconhece esses problemas?</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Dores que a ClimaTrak resolve
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Se você já passou por alguma dessas situações, a ClimaTrak foi feita para você.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {painPoints.map((point, i) => (
              <Card key={i} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                    <point.icon className="w-6 h-6 text-red-600 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-red-600 font-medium mb-1">❌ Problema</div>
                    <p className="font-semibold">{point.problem}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-teal-600 font-medium mb-1">✓ Solução</div>
                    <p className="text-muted-foreground text-sm">{point.solution}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4">Ecossistema integrado</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              4 módulos. 1 plataforma. Zero retrabalho.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cada módulo funciona sozinho, mas juntos entregam resultados exponenciais.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.name} to={product.href}>
                <Card className="h-full hover:shadow-xl transition-all group hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${product.color} flex items-center justify-center`}>
                        <span className="text-xl font-bold text-white">{product.name[0]}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{product.highlight}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{product.name}</h3>
                      <span className="text-xs text-muted-foreground">{product.subtitle}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
                    <div className="flex items-center text-teal-600 font-medium text-sm group-hover:gap-2 transition-all">
                      Conhecer módulo <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Segments Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4">Segmentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Resultados comprovados em cada setor
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A plataforma se adapta às necessidades específicas do seu segmento.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {segments.map((segment) => (
              <Link key={segment.name} to={segment.href}>
                <Card className="h-full hover:shadow-xl transition-all group hover:-translate-y-1 text-center">
                  <CardContent className="pt-8 pb-8">
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-600 transition-colors">
                      <segment.icon className="w-8 h-8 text-teal-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{segment.name}</h3>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-teal-600">{segment.stat}</span>
                      <span className="text-sm text-muted-foreground ml-2">{segment.statLabel}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{segment.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Resultados reais de empresas que transformaram sua operação com a ClimaTrak.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} />
            ))}
          </div>
          
          {/* Trusted by */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">Empresas que confiam na ClimaTrak</p>
            <div className="flex flex-wrap justify-center gap-6">
              {trustedBy.map((company) => (
                <div key={company} className="text-sm text-muted-foreground font-medium px-4 py-2 bg-white rounded-lg border">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4">Como funciona</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Implementação em 7 dias
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Processo simples e acompanhado para você começar a ver resultados rápido.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Diagnóstico', desc: 'Entendemos sua operação e mapeamos ativos' },
              { step: '2', title: 'Configuração', desc: 'Importamos dados e configuramos a plataforma' },
              { step: '3', title: 'Treinamento', desc: 'Capacitamos sua equipe para usar o sistema' },
              { step: '4', title: 'Go-live', desc: 'Acompanhamos os primeiros 30 dias' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Cards */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Por que a ClimaTrak?</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Diferente de tudo que você já viu
              </h2>
              <div className="space-y-4">
                {[
                  'Plataforma 100% integrada (CMMS + IoT + Financeiro)',
                  'Laudos PMOC gerados automaticamente',
                  'Alertas preditivos que evitam falhas',
                  'Controle de custos por ativo em tempo real',
                  'Setup em 7 dias, não meses',
                  'Suporte brasileiro dedicado',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Começar agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <Zap className="w-8 h-8 text-amber-500 mb-3" />
                <div className="text-2xl font-bold mb-1">7 dias</div>
                <p className="text-sm text-muted-foreground">Para estar operacional</p>
              </Card>
              <Card className="p-6">
                <BarChart3 className="w-8 h-8 text-blue-500 mb-3" />
                <div className="text-2xl font-bold mb-1">KPIs</div>
                <p className="text-sm text-muted-foreground">MTTR, disponibilidade, backlog</p>
              </Card>
              <Card className="p-6">
                <Bell className="w-8 h-8 text-red-500 mb-3" />
                <div className="text-2xl font-bold mb-1">24/7</div>
                <p className="text-sm text-muted-foreground">Monitoramento e alertas</p>
              </Card>
              <Card className="p-6">
                <FileText className="w-8 h-8 text-green-500 mb-3" />
                <div className="text-2xl font-bold mb-1">PMOC</div>
                <p className="text-sm text-muted-foreground">Laudos prontos para auditoria</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para parar de apagar incêndios?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Agende uma demonstração gratuita de 30 minutos e veja como a ClimaTrak pode transformar 
            sua operação de manutenção.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/demo">
              <Button size="lg" variant="secondary" className="bg-white text-teal-600 hover:bg-teal-50 text-base px-8">
                Agendar demonstração gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-base">
                Falar com especialista
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-teal-200">
            ✓ Demonstração personalizada &nbsp;&nbsp; ✓ Sem compromisso &nbsp;&nbsp; ✓ Resposta em 24h
          </p>
        </div>
      </section>
    </div>
  )
}
