import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { personaSections } from '@/content/marketingStructure'
import {
  ArrowRight,
  Activity,
  Shield,
  Clock,
  TrendingDown,
  Building2,
  Factory,
  Hospital,
  CheckCircle2,
  Zap,
  BarChart3,
  Bell,
  FileText
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Monitoramento em tempo real',
    description: 'Sensores IoT e dashboards para agir antes do desvio virar falha.',
  },
  {
    icon: Shield,
    title: 'Conformidade PMOC',
    description: 'Relatorios e evidencias prontos para auditorias e contratos.',
  },
  {
    icon: Clock,
    title: 'Manutencao preditiva',
    description: 'Alertas inteligentes para antecipar falhas e reduzir downtime.',
  },
  {
    icon: TrendingDown,
    title: 'Reducao de custos',
    description: 'Menos corretivas e mais previsibilidade financeira por ativo.',
  },
]

const products = [
  {
    name: 'TrakNor',
    subtitle: 'CMMS',
    description: 'CMMS completo para ordens de servico, planos, equipes e ativos.',
    color: 'from-teal-600 to-teal-400',
    href: '/produtos/traknor',
  },
  {
    name: 'TrakSense',
    subtitle: 'IoT Platform',
    description: 'Monitoramento IoT com alertas, dashboards e automacoes inteligentes.',
    color: 'from-cyan-600 to-cyan-400',
    href: '/produtos/traksense',
  },
  {
    name: 'AirTrak',
    subtitle: 'Smart Sensor',
    description: 'Sensor HVAC plug and play para dados confiaveis.',
    color: 'from-emerald-600 to-emerald-400',
    href: '/produtos/airtrak',
  },
  {
    name: 'TrakLedger',
    subtitle: 'Cost Control',
    description: 'Custos, orcamentos e economias conectados a cada OS.',
    color: 'from-violet-600 to-violet-400',
    href: '/produtos/trakledger',
  },
]

const segments = [
  {
    icon: Hospital,
    name: 'Hospitais e Clinicas',
    description: 'Ambientes criticos, compliance e rastreabilidade.',
  },
  {
    icon: Factory,
    name: 'Industrias',
    description: 'Disponibilidade e previsibilidade para producao.',
  },
  {
    icon: Building2,
    name: 'Shoppings e Facilities',
    description: 'Operacao multi-site com padronizacao.',
  },
]

const stats = [
  { value: '40%', label: 'Reducao em custos corretivos' },
  { value: '99.9%', label: 'Disponibilidade da plataforma' },
  { value: '+500', label: 'Ativos monitorados' },
  { value: '24/7', label: 'Alertas e monitoramento' },
]

const benefits = [
  'Reduza falhas em equipamentos criticos',
  'KPIs claros com dados em tempo real',
  'Relatorios PMOC prontos para auditoria',
  'Dashboard com MTTR, backlog e disponibilidade',
  'Alertas inteligentes baseados em sensores',
  'Laudos prontos para PDF e Excel',
]

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="container-wide section-padding">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <Badge className="mb-4" variant="secondary">
                Plataforma completa para operacoes HVAC
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Transforme seus ativos em{' '}
                <span className="text-gradient">inteligencia operacional</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                A ClimaTrak integra software (TrakNor), monitoramento IoT (TrakSense) e sensores
                (AirTrak) para reduzir falhas, custos e garantir conformidade com PMOC.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="xl">
                    Agendar demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/produtos">
                  <Button size="xl" variant="outline">
                    Conhecer produtos
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 border shadow-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                      <Activity className="w-16 h-16 text-brand-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Dashboard Preview</p>
                  </div>
                </div>
              </div>
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Sistema online</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">0 alertas criticos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="container-wide">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo o que voce precisa para gerir ativos HVAC
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma unica para manutencao, IoT e conformidade.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Ecossistema</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Conheca nossos produtos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Solucoes integradas para transformar a gestao dos seus ativos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link key={product.name} to={product.href}>
                <Card className="h-full card-hover group">
                  <CardContent className="pt-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${product.color} flex items-center justify-center mb-4`}>
                      <span className="text-2xl font-bold text-white">{product.name[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{product.name}</h3>
                      <Badge variant="secondary" className="text-xs">{product.subtitle}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{product.description}</p>
                    <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                      Saiba mais <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Persona Features Section */}
      <section id="funcionalidades" className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Funcionalidades por perfil
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Organizacao clara das capacidades para gestores e clientes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {personaSections.map((section) => (
              <Card key={section.id} className="card-hover">
                <CardContent className="pt-6">
                  <Badge variant="secondary" className="mb-3">{section.name}</Badge>
                  <p className="text-sm text-muted-foreground mb-6">{section.description}</p>
                  <div className="space-y-4">
                    {section.items.map((item) => (
                      <div key={item.name} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <Link to={item.href} className="font-semibold hover:underline">
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Beneficios</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Por que empresas escolhem a ClimaTrak?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/demo">
                  <Button size="lg">
                    Comecar agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <Zap className="w-8 h-8 text-amber-500 mb-3" />
                <div className="text-2xl font-bold mb-1">7 dias</div>
                <p className="text-sm text-muted-foreground">para ter insights e relatorios prontos</p>
              </Card>
              <Card className="p-6">
                <BarChart3 className="w-8 h-8 text-blue-500 mb-3" />
                <div className="text-2xl font-bold mb-1">KPIs</div>
                <p className="text-sm text-muted-foreground">MTTR, downtime, ativos criticos</p>
              </Card>
              <Card className="p-6">
                <Bell className="w-8 h-8 text-red-500 mb-3" />
                <div className="text-2xl font-bold mb-1">Alertas</div>
                <p className="text-sm text-muted-foreground">Inteligentes baseados em sensores IoT</p>
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

      {/* Segments Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Segmentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Solucoes para cada setor
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Adaptamos a plataforma as necessidades de cada segmento.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <Card key={segment.name} className="card-hover text-center">
                <CardContent className="pt-8 pb-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <segment.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{segment.name}</h3>
                  <p className="text-muted-foreground">{segment.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-brand text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para transformar sua gestao de ativos?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demo e veja como a ClimaTrak ajuda sua empresa a evitar falhas,
            reduzir custos e garantir conformidade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Agendar demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                Falar com especialista
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
