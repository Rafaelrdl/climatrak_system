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
    title: 'Hospitais e Clinicas',
    subtitle: 'Ambientes criticos e compliance',
    description: 'Controle PMOC, evidencias e rastreabilidade para auditorias frequentes.',
    challenges: [
      'Risco regulatorio e exigencias legais',
      'Equipamentos criticos sem margem para falha',
      'Documentacao obrigatoria por ativo',
      'Historico disperso entre equipes',
    ],
    benefits: [
      'Laudos PMOC automaticos e padronizados',
      'Alertas imediatos em caso de desvio',
      'Historico completo por area critica',
      'Relatorios prontos para auditoria',
    ],
    color: 'red',
  },
  {
    id: 'industrias',
    icon: Factory,
    title: 'Industrias',
    subtitle: 'Disponibilidade e previsibilidade',
    description: 'Evite paradas nao planejadas com monitoramento e manutencao preditiva.',
    challenges: [
      'Downtime com alto impacto financeiro',
      'Manutencao reativa e custos elevados',
      'Baixa visibilidade da saude dos ativos',
      'Dificuldade em priorizar investimentos',
    ],
    benefits: [
      'Alertas antes da falha acontecer',
      'KPIs claros de desempenho e custo',
      'Menos corretivas e mais preventivas',
      'Decisoes com dados em tempo real',
    ],
    color: 'amber',
  },
  {
    id: 'facilities',
    icon: Building2,
    title: 'Shoppings e Facilities',
    subtitle: 'Operacao multi-site',
    description: 'Gestao centralizada de ativos e equipes em multiplas unidades.',
    challenges: [
      'Muitos locais para gerenciar',
      'Padronizacao dificil entre unidades',
      'Equipes terceiras e internas misturadas',
      'Relatorios consolidados complexos',
    ],
    benefits: [
      'Visao unificada de todos os sites',
      'Fluxos padronizados e auditaveis',
      'Relatorios consolidados automaticos',
      'Gestao remota com SLA claro',
    ],
    color: 'blue',
  },
]

const features = [
  {
    icon: ShieldCheck,
    title: 'Conformidade automatizada',
    description: 'Relatorios PMOC e documentacao gerados automaticamente.',
  },
  {
    icon: Activity,
    title: 'Monitoramento em tempo real',
    description: 'Temperatura, umidade e pressao com dashboards ao vivo.',
  },
  {
    icon: Bell,
    title: 'Alertas inteligentes',
    description: 'Notificacoes proativas quando algo sai do limite.',
  },
  {
    icon: Clock,
    title: 'Manutencao preventiva',
    description: 'Ordens automaticas por tempo, uso ou condicao.',
  },
  {
    icon: FileText,
    title: 'Historico completo',
    description: 'Tudo registrado por ativo, unidade e equipe.',
  },
  {
    icon: TrendingDown,
    title: 'Reducao de custos',
    description: 'Menos corretivas e mais controle financeiro.',
  },
]

export function SolutionsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Solucoes por segmento</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Solucoes adaptadas ao seu negocio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada setor tem desafios proprios. A ClimaTrak se adapta para entregar resultados
            em hospitais, industrias e operacoes multi-site.
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
              className="grid lg:grid-cols-2 gap-12 items-center scroll-mt-24"
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
                    <h3 className="font-semibold mb-3 text-red-600">Desafios do setor</h3>
                    <ul className="space-y-2">
                      {solution.challenges.map((challenge) => (
                        <li key={challenge} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500">-</span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-green-600">Como ajudamos</h3>
                    <ul className="space-y-2">
                      {solution.benefits.map((benefit) => (
                        <li key={benefit} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500">+</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link to="/demo">
                  <Button size="lg">
                    Solicitar demo para {solution.title.split(' ')[0]}
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
              Independente do segmento, essas funcionalidades elevam sua operacao.
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
            Pronto para transformar sua operacao?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demo personalizada e veja como podemos ajudar seu segmento.
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
