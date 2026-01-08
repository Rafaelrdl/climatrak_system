import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Wrench, Activity, Cpu, Check, DollarSign } from 'lucide-react'

const products = [
  {
    id: 'traknor',
    name: 'TrakNor',
    subtitle: 'CMMS - Gestao de Manutencao',
    description: 'Controle ordens, planos e ativos com fluxos padronizados e rastreaveis.',
    icon: Wrench,
    color: 'teal',
    gradient: 'from-teal-600 to-teal-400',
    bgLight: 'bg-teal-100',
    textColor: 'text-teal-700',
    checkColor: 'text-teal-500',
    features: [
      'Ordens de servico e planos',
      'Manutencao preventiva e corretiva',
      'Cadastro de ativos e hierarquias',
      'Checklist e evidencias',
      'Gestao de equipes e SLAs',
      'Relatorios PMOC e auditoria',
      'KPIs com MTTR e backlog',
      'App mobile para campo',
    ],
    href: '/produtos/traknor',
  },
  {
    id: 'traksense',
    name: 'TrakSense',
    subtitle: 'IoT Platform',
    description: 'Dashboards e alertas IoT para monitorar desempenho em tempo real.',
    icon: Activity,
    color: 'cyan',
    gradient: 'from-teal-600 to-teal-400',
    bgLight: 'bg-teal-100',
    textColor: 'text-teal-700',
    checkColor: 'text-teal-500',
    features: [
      'Dashboards em tempo real',
      'Alertas inteligentes',
      'Tendencias e anomalias',
      'Integracao com TrakNor',
      'Sensores AirTrak',
      'Suporte multi-site',
      'API e webhooks',
      'Historico de leituras',
    ],
    href: '/produtos/traksense',
  },
  {
    id: 'airtrak',
    name: 'AirTrak',
    subtitle: 'Smart Sensor',
    description: 'Sensor HVAC plug and play para dados confiaveis e auditaveis.',
    icon: Cpu,
    color: 'emerald',
    gradient: 'from-teal-600 to-teal-400',
    bgLight: 'bg-teal-100',
    textColor: 'text-teal-700',
    checkColor: 'text-teal-500',
    features: [
      'Temperatura e umidade',
      'Pressao diferencial',
      'Conectividade WiFi/LoRa',
      'Bateria de longa duracao',
      'Instalacao simplificada',
      'Calibracao automatica',
      'Design industrial',
      'Certificacao IP65',
    ],
    href: '/produtos/airtrak',
  },
  {
    id: 'trakledger',
    name: 'TrakLedger',
    subtitle: 'Cost Control',
    description: 'Custos, orcamentos e ROI de manutencao conectados a cada OS.',
    icon: DollarSign,
    color: 'violet',
    gradient: 'from-teal-600 to-teal-400',
    bgLight: 'bg-teal-100',
    textColor: 'text-teal-700',
    checkColor: 'text-teal-500',
    features: [
      'Orcamentos por centro de custo',
      'Lancamentos automaticos',
      'Compromissos e provisoes',
      'Registro de economias',
      'Dashboards financeiros',
      'Alertas de orcamento',
      'Relatorios por periodo',
      'Integracao com TrakNor',
    ],
    href: '/produtos/trakledger',
  },
]

export function ProductsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Ecossistema ClimaTrak</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Nossos produtos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um ecossistema completo para manter ativos HVAC disponiveis, reduzir custos
            e entregar transparencia para o cliente.
          </p>
        </div>
      </section>

      {/* Products List */}
      <section className="section-padding">
        <div className="container-wide space-y-24">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${product.bgLight} ${product.textColor} mb-4`}>
                  <product.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{product.subtitle}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{product.name}</h2>
                <p className="text-lg text-muted-foreground mb-6">{product.description}</p>

                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  {product.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className={`w-5 h-5 ${product.checkColor} flex-shrink-0`} />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link to={product.href}>
                  <Button size="lg">
                    Conhecer {product.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <Card className="overflow-hidden">
                  <div className={`h-80 bg-gradient-to-br ${product.gradient} flex items-center justify-center`}>
                    <div className="w-32 h-32 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                      <product.icon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integration Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Integracao total</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Produtos que trabalham juntos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sensores AirTrak alimentam o TrakSense, que dispara alertas e cria OS no TrakNor,
              com custos registrados automaticamente no TrakLedger.
            </p>
          </div>

          <div className="relative">
            <div className="grid md:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <Card key={product.id} className="relative">
                  <CardContent className="pt-6 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${product.gradient} flex items-center justify-center mb-4`}>
                      <product.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.subtitle}</p>
                  </CardContent>
                  {index < products.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-brand text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Qual produto e ideal para voce?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Nossa equipe pode ajudar voce a escolher a melhor combinacao para sua operacao.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Agendar demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/precos">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                Ver precos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
