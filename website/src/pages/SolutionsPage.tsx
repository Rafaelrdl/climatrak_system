import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  TrendingDown
} from 'lucide-react'

const solutions = [
  {
    id: 'hospitais',
    icon: Hospital,
    title: 'Hospitais & Clínicas',
    subtitle: 'Engenharia Clínica e Compliance',
    description: 'Garantia de conformidade com ANVISA, gestão de áreas críticas e laudos acessíveis para auditorias.',
    challenges: [
      'Risco regulatório (ANVISA)',
      'Equipamentos críticos em áreas sensíveis',
      'Necessidade de documentação para auditorias',
      'Alta criticidade de falhas',
    ],
    benefits: [
      'Laudos PMOC automáticos para auditorias',
      'Monitoramento 24/7 de áreas críticas',
      'Alertas imediatos em caso de falhas',
      'Histórico completo para compliance',
    ],
    color: 'red',
  },
  {
    id: 'industrias',
    icon: Factory,
    title: 'Indústrias',
    subtitle: 'Prevenção de Downtime',
    description: 'Controle preditivo para evitar paradas não programadas e manter a linha de produção funcionando.',
    challenges: [
      'Downtime custa milhares por hora',
      'Manutenção reativa é cara',
      'Falta de visibilidade dos equipamentos',
      'Dificuldade em prever falhas',
    ],
    benefits: [
      'Manutenção preditiva baseada em dados',
      'Redução de até 40% em custos de manutenção',
      'Alertas antes das falhas acontecerem',
      'KPIs de performance em tempo real',
    ],
    color: 'amber',
  },
  {
    id: 'facilities',
    icon: Building2,
    title: 'Shoppings & Facilities',
    subtitle: 'Gestão Multi-site',
    description: 'Gestão distribuída de ativos em múltiplos pavimentos e localidades com visualização centralizada.',
    challenges: [
      'Múltiplos locais para gerenciar',
      'Dificuldade de padronização',
      'Equipes descentralizadas',
      'Relatórios consolidados complexos',
    ],
    benefits: [
      'Visão unificada de todos os sites',
      'Padronização de processos',
      'Relatórios consolidados automáticos',
      'Gestão remota eficiente',
    ],
    color: 'blue',
  },
]

const features = [
  {
    icon: ShieldCheck,
    title: 'Conformidade Automática',
    description: 'Relatórios PMOC e documentação gerados automaticamente, prontos para auditorias e fiscalizações.',
  },
  {
    icon: Activity,
    title: 'Monitoramento Real-time',
    description: 'Acompanhe temperatura, umidade e pressão dos seus equipamentos HVAC em tempo real.',
  },
  {
    icon: Bell,
    title: 'Alertas Inteligentes',
    description: 'Seja notificado imediatamente quando parâmetros saírem dos limites aceitáveis.',
  },
  {
    icon: Clock,
    title: 'Manutenção Preventiva',
    description: 'Ordens de serviço automáticas baseadas em tempo, uso ou condição do equipamento.',
  },
  {
    icon: FileText,
    title: 'Histórico Completo',
    description: 'Todo o histórico de manutenções, leituras e eventos em um só lugar.',
  },
  {
    icon: TrendingDown,
    title: 'Redução de Custos',
    description: 'Reduza custos com manutenção corretiva e aumente a vida útil dos equipamentos.',
  },
]

export function SolutionsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Soluções por Segmento</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Soluções adaptadas ao seu negócio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada setor tem desafios únicos. Nossa plataforma se adapta às necessidades 
            específicas de hospitais, indústrias e facilities.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="section-padding">
        <div className="container-wide space-y-24">
          {solutions.map((solution, index) => (
            <div 
              key={solution.id} 
              id={solution.id}
              className={`grid lg:grid-cols-2 gap-12 items-center scroll-mt-24`}
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${solution.color}-100 flex items-center justify-center`}>
                    <solution.icon className={`w-6 h-6 text-${solution.color}-600`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{solution.title}</h2>
                    <p className="text-sm text-muted-foreground">{solution.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-lg text-muted-foreground mb-8">{solution.description}</p>
                
                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="font-semibold mb-3 text-red-600">Desafios do Setor</h3>
                    <ul className="space-y-2">
                      {solution.challenges.map((challenge) => (
                        <li key={challenge} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-green-600">Como Ajudamos</h3>
                    <ul className="space-y-2">
                      {solution.benefits.map((benefit) => (
                        <li key={benefit} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <Link to="/demo">
                  <Button size="lg">
                    Solicitar Demo para {solution.title.split(' ')[0]}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <Card className="overflow-hidden">
                  <div className={`h-80 bg-gradient-to-br from-${solution.color}-100 to-${solution.color}-50 flex items-center justify-center`}>
                    <solution.icon className={`w-32 h-32 text-${solution.color}-300`} />
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold mb-4">
              O que todos os setores ganham
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Independente do seu segmento, essas funcionalidades estão disponíveis para transformar sua operação.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* CTA Section */}
      <section className="section-padding bg-gradient-brand text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para transformar sua operação?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração personalizada e veja como podemos ajudar seu segmento específico.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Agendar Demo Gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                Falar com Especialista
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
