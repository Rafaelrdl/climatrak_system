import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Hospital,
  Factory,
  Building2,
  ShieldCheck,
  Clock,
  FileText,
  Activity,
  Bell,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Zap,
  BarChart3,
  Users,
  MapPin,
  Target,
  Play,
} from 'lucide-react'

// ============================================================================
// DATA
// ============================================================================

const heroStats = [
  { value: 'R$ 2.4M', label: 'Economizados por clientes' },
  { value: '-47%', label: 'Redução em corretivas' },
  { value: '100%', label: 'Conformidade PMOC' },
  { value: '< 4 meses', label: 'ROI médio' },
]

const solutions = [
  {
    id: 'hospitais',
    icon: Hospital,
    title: 'Hospitais e Clínicas',
    subtitle: 'Ambientes críticos e compliance',
    description:
      'Em ambientes hospitalares, falhas de climatização podem comprometer a segurança de pacientes e a validade de medicamentos. A ClimaTrak garante conformidade PMOC, rastreabilidade total e alertas imediatos.',
    heroImage: 'hospital',
    color: 'red',
    stats: [
      { value: '100%', label: 'PMOC em dia' },
      { value: '< 2min', label: 'Tempo de alerta' },
      { value: '5 anos', label: 'Histórico completo' },
    ],
    challenges: [
      { icon: FileText, text: 'Auditorias frequentes exigem documentação impecável' },
      { icon: AlertTriangle, text: 'Falhas podem comprometer vidas e medicamentos' },
      { icon: Clock, text: 'Manutenções não podem atrasar em áreas críticas' },
      { icon: Users, text: 'Múltiplas equipes (próprias e terceiras) difíceis de coordenar' },
    ],
    benefits: [
      { icon: ShieldCheck, title: 'PMOC Automático', desc: 'Laudos gerados e assinados digitalmente' },
      { icon: Bell, title: 'Alertas Críticos', desc: 'Notificação em < 2 min para desvios' },
      { icon: Activity, title: 'Monitoramento 24/7', desc: 'Temperatura, umidade e pressão ao vivo' },
      { icon: FileText, title: 'Auditoria Ready', desc: 'Histórico completo por área e ativo' },
    ],
    useCases: [
      'UTIs e Centros Cirúrgicos',
      'Farmácias e Bancos de Sangue',
      'Laboratórios de Análises',
      'Salas de Vacina',
    ],
    testimonial: {
      text: 'Passamos na auditoria da Vigilância sem nenhuma pendência. Todos os laudos estavam prontos.',
      author: 'Dr. Ricardo Mendes',
      role: 'Diretor Técnico - Hospital Regional',
    },
  },
  {
    id: 'industrias',
    icon: Factory,
    title: 'Indústrias',
    subtitle: 'Disponibilidade e previsibilidade',
    description:
      'Paradas não planejadas custam milhares por hora. A ClimaTrak usa monitoramento IoT e manutenção preditiva para antecipar falhas e maximizar disponibilidade dos seus equipamentos.',
    heroImage: 'factory',
    color: 'amber',
    stats: [
      { value: '-60%', label: 'Corretivas' },
      { value: '+25%', label: 'Vida útil' },
      { value: 'R$ 0', label: 'Surpresas' },
    ],
    challenges: [
      { icon: TrendingDown, text: 'Downtime com alto impacto financeiro' },
      { icon: Gauge, text: 'Equipamentos operando sem visibilidade de saúde' },
      { icon: Target, text: 'Dificuldade em priorizar investimentos' },
      { icon: BarChart3, text: 'KPIs dispersos em planilhas' },
    ],
    benefits: [
      { icon: Zap, title: 'Alertas Preditivos', desc: 'Saiba antes da falha acontecer' },
      { icon: BarChart3, title: 'KPIs em Tempo Real', desc: 'MTTR, MTBF, disponibilidade' },
      { icon: TrendingDown, title: 'Menos Corretivas', desc: 'Foco em preventiva e preditiva' },
      { icon: Target, title: 'Decisões com Dados', desc: 'Priorize investimentos com ROI claro' },
    ],
    useCases: [
      'Linhas de Produção',
      'Data Centers',
      'Câmaras Frias',
      'Salas Limpas',
    ],
    testimonial: {
      text: 'Reduzimos 60% das paradas não planejadas no primeiro ano. O ROI veio em 4 meses.',
      author: 'Eng. Paulo Ferreira',
      role: 'Gerente de Manutenção - Indústria Alimentícia',
    },
  },
  {
    id: 'facilities',
    icon: Building2,
    title: 'Shoppings e Facilities',
    subtitle: 'Operação multi-site',
    description:
      'Gerencie dezenas de unidades com a mesma qualidade e padronização. Visão consolidada, relatórios automáticos e controle de SLA para equipes próprias e terceiras.',
    heroImage: 'building',
    color: 'blue',
    stats: [
      { value: '50+', label: 'Sites em 1 tela' },
      { value: '98%', label: 'SLA cumprido' },
      { value: '-30%', label: 'Tempo de gestão' },
    ],
    challenges: [
      { icon: MapPin, text: 'Muitos locais para gerenciar com padrão' },
      { icon: Users, text: 'Equipes terceiras e internas misturadas' },
      { icon: FileText, text: 'Relatórios consolidados são trabalhosos' },
      { icon: Clock, text: 'SLA difícil de acompanhar em escala' },
    ],
    benefits: [
      { icon: MapPin, title: 'Visão Unificada', desc: 'Todos os sites em um dashboard' },
      { icon: ShieldCheck, title: 'Padronização', desc: 'Fluxos iguais em todas as unidades' },
      { icon: FileText, title: 'Relatórios Auto', desc: 'Consolidado mensal sem esforço' },
      { icon: Target, title: 'Gestão de SLA', desc: 'Acompanhe cumprimento por contrato' },
    ],
    useCases: [
      'Redes de Varejo',
      'Shoppings Centers',
      'Condomínios Comerciais',
      'Franquias',
    ],
    testimonial: {
      text: 'Antes eu gastava 2 dias para consolidar relatórios. Agora é automático.',
      author: 'Fernanda Lima',
      role: 'Coordenadora de Facilities - Rede de Shoppings',
    },
  },
]

const crossFeatures = [
  {
    icon: ShieldCheck,
    title: 'Conformidade automatizada',
    description: 'Relatórios PMOC e documentação gerados automaticamente com assinatura digital.',
  },
  {
    icon: Activity,
    title: 'Monitoramento em tempo real',
    description: 'Temperatura, umidade e pressão com dashboards ao vivo e histórico completo.',
  },
  {
    icon: Bell,
    title: 'Alertas inteligentes',
    description: 'Notificações proativas por e-mail, SMS ou WhatsApp quando algo sai do limite.',
  },
  {
    icon: Clock,
    title: 'Manutenção preventiva',
    description: 'Ordens automáticas por tempo, uso ou condição do equipamento.',
  },
  {
    icon: FileText,
    title: 'Histórico completo',
    description: 'Tudo registrado por ativo, unidade e equipe. Auditoria sem surpresas.',
  },
  {
    icon: TrendingDown,
    title: 'Redução de custos',
    description: 'Menos corretivas, mais controle financeiro e decisões baseadas em dados.',
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function SegmentMockup({ segment }: { segment: typeof solutions[0] }) {
  const Icon = segment.icon
  const colorClasses = {
    red: { bg: 'from-red-500 to-rose-600', light: 'bg-red-100', text: 'text-red-600' },
    amber: { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-100', text: 'text-amber-600' },
    blue: { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-100', text: 'text-blue-600' },
  }[segment.color] ?? { bg: 'from-teal-500 to-teal-600', light: 'bg-teal-100', text: 'text-teal-600' }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
      <div className={cn('bg-gradient-to-r px-6 py-5 text-white', colorClasses.bg)}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-xl">{segment.title}</h3>
            <p className="text-white/80 text-sm">{segment.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {segment.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={cn('text-2xl font-bold', colorClasses.text)}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Use cases */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">Aplicações comuns</div>
          <div className="grid grid-cols-2 gap-2">
            {segment.useCases.map((useCase) => (
              <div key={useCase} className="flex items-center gap-2">
                <CheckCircle2 className={cn('w-4 h-4', colorClasses.text)} />
                <span className="text-sm">{useCase}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full" asChild>
          <Link to={`/demo?segmento=${segment.id}`}>
            Ver demo para {segment.title.split(' ')[0]}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function TestimonialCard({ testimonial, color }: { testimonial: typeof solutions[0]['testimonial']; color: string }) {
  const colorClasses = {
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
  }[color]

  return (
    <div className={cn('rounded-xl border-2 p-6', colorClasses)}>
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
      <div>
        <div className="font-semibold">{testimonial.author}</div>
        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SolutionsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-slate-50 via-white to-teal-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="container-wide">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4">Resultados comprovados por segmento</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Soluções que{' '}
              <span className="text-gradient">falam a sua língua</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Hospitais precisam de conformidade total. Indústrias não podem parar.
              Facilities gerenciam dezenas de locais. <strong>A ClimaTrak entende e resolve cada desafio.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl">
                <Link to="/demo">
                  Ver demonstração para meu segmento
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="#hospitais">
                  <Play className="mr-2 h-5 w-5" />
                  Explorar casos de sucesso
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-2xl shadow-lg border p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {heroStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Segments */}
      {solutions.map((segment, index) => {
        const colorClasses = {
          red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', light: 'bg-red-100' },
          amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', light: 'bg-amber-100' },
          blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-100' },
        }[segment.color] ?? { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', light: 'bg-teal-100' }

        return (
          <section
            key={segment.id}
            id={segment.id}
            className={cn('section-padding scroll-mt-20', index % 2 === 1 && 'bg-muted/30')}
          >
            <div className="container-wide">
              {/* Section Header */}
              <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorClasses.light)}>
                      <segment.icon className={cn('w-6 h-6', colorClasses.text)} />
                    </div>
                    <Badge className={cn(colorClasses.light, colorClasses.text)}>{segment.subtitle}</Badge>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">{segment.title}</h2>
                  <p className="text-lg text-muted-foreground mb-8">{segment.description}</p>

                  {/* Challenges */}
                  <div className="mb-8">
                    <h3 className="font-semibold mb-4 text-gray-900">Desafios do setor</h3>
                    <div className="space-y-3">
                      {segment.challenges.map((challenge) => (
                        <div key={challenge.text} className="flex items-start gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClasses.light)}>
                            <challenge.icon className={cn('w-4 h-4', colorClasses.text)} />
                          </div>
                          <span className="text-muted-foreground">{challenge.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <SegmentMockup segment={segment} />
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold mb-6 text-center">Como a ClimaTrak ajuda</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {segment.benefits.map((benefit) => (
                    <Card key={benefit.title} className="card-hover">
                      <CardContent className="pt-6">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', colorClasses.light)}>
                          <benefit.icon className={cn('w-6 h-6', colorClasses.text)} />
                        </div>
                        <h4 className="font-semibold mb-2">{benefit.title}</h4>
                        <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="max-w-2xl mx-auto">
                <TestimonialCard testimonial={segment.testimonial} color={segment.color} />
              </div>
            </div>
          </section>
        )
      })}

      {/* Cross Features */}
      <section className="section-padding bg-gray-900 text-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white/10 text-white">Para todos os segmentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Funcionalidades que elevam qualquer operação
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Independente do seu setor, essas funcionalidades trazem resultados.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {crossFeatures.map((feature) => (
              <div key={feature.title} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Qual resultado você quer alcançar?
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração personalizada. Mostramos exatamente como a ClimaTrak resolve 
            os desafios específicos do seu segmento — com números reais de clientes similares.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
              <Link to="/demo">
                Agendar demonstração gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link to="/contato">Falar com especialista do meu setor</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-teal-200">
            ✓ Demonstração personalizada  ✓ Cases do seu segmento  ✓ ROI calculado
          </p>
        </div>
      </section>
    </div>
  )
}
