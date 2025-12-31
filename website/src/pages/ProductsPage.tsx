import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Wrench, Activity, Cpu, Check, DollarSign } from 'lucide-react'

const products = [
  {
    id: 'traknor',
    name: 'TrakNor',
    subtitle: 'CMMS - Sistema de Gestão de Manutenção',
    description: 'Plataforma completa para gerenciar todo o ciclo de vida dos seus ativos, desde cadastro até ordens de serviço, inventário e relatórios.',
    icon: Wrench,
    color: 'teal',
    gradient: 'from-teal-600 to-teal-400',
    bgLight: 'bg-teal-100',
    textColor: 'text-teal-700',
    checkColor: 'text-teal-500',
    features: [
      'Gestão de Ordens de Serviço',
      'Manutenção Preventiva e Corretiva',
      'Inventário de Peças e Insumos',
      'Gestão de Equipes e Técnicos',
      'Relatórios PMOC Automatizados',
      'Dashboard com KPIs em Tempo Real',
      'Histórico Completo dos Ativos',
      'Aplicativo Mobile para Técnicos',
    ],
    href: '/produtos/traknor',
  },
  {
    id: 'traksense',
    name: 'TrakSense',
    subtitle: 'Plataforma IoT de Monitoramento',
    description: 'Monitoramento em tempo real dos seus equipamentos HVAC com dashboards interativos, alertas inteligentes e análise de dados.',
    icon: Activity,
    color: 'cyan',
    gradient: 'from-cyan-600 to-cyan-400',
    bgLight: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    checkColor: 'text-cyan-500',
    features: [
      'Dashboards Customizáveis',
      'Alertas em Tempo Real',
      'Análise de Tendências',
      'Integração com TrakNor',
      'Múltiplos Protocolos IoT',
      'API para Integrações',
      'Relatórios Automatizados',
      'Suporte Multi-site',
    ],
    href: '/produtos/traksense',
  },
  {
    id: 'airtrak',
    name: 'AirTrak',
    subtitle: 'Sensor Inteligente para HVAC',
    description: 'Sensor plug & play para monitoramento de temperatura, umidade e pressão em equipamentos de climatização.',
    icon: Cpu,
    color: 'emerald',
    gradient: 'from-emerald-600 to-emerald-400',
    bgLight: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    checkColor: 'text-emerald-500',
    features: [
      'Temperatura e Umidade',
      'Pressão Diferencial',
      'Conectividade WiFi/LoRa',
      'Bateria de Longa Duração',
      'Instalação Simplificada',
      'Calibração Automática',
      'Design Industrial',
      'Certificação IP65',
    ],
    href: '/produtos/airtrak',
  },
  {
    id: 'finance',
    name: 'Finance',
    subtitle: 'Módulo de Gestão Financeira',
    description: 'Controle total dos custos de manutenção com orçamentos, lançamentos automáticos, compromissos e registro de economias.',
    icon: DollarSign,
    color: 'violet',
    gradient: 'from-violet-600 to-violet-400',
    bgLight: 'bg-violet-100',
    textColor: 'text-violet-700',
    checkColor: 'text-violet-500',
    features: [
      'Orçamentos por Centro de Custo',
      'Lançamentos Automáticos',
      'Compromissos de Manutenção',
      'Registro de Economias',
      'Dashboards Financeiros',
      'Alertas de Orçamento',
      'Relatórios por Período',
      'Integração com TrakNor',
    ],
    href: '/produtos/finance',
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
            Nossos Produtos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um ecossistema completo de soluções integradas para transformar a gestão 
            dos seus ativos HVAC. Software + IoT + Hardware trabalhando juntos.
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
            <Badge className="mb-4">Integração Total</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Produtos que trabalham juntos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nosso ecossistema foi projetado para integração perfeita. 
              Os sensores AirTrak alimentam o TrakSense, que cria alertas e OS automáticas no TrakNor, 
              com custos registrados automaticamente no Finance.
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
            Qual produto é ideal para você?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Nossos especialistas podem ajudar você a escolher a melhor combinação 
            de produtos para as necessidades da sua empresa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Agendar Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/precos">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
                Ver Preços
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
