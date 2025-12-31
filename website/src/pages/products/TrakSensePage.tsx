import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Activity, 
  Bell, 
  LineChart, 
  Gauge, 
  Wifi,
  Database,
  Layers,
  Zap,
  Clock,
  Globe
} from 'lucide-react'

const features = [
  {
    icon: Gauge,
    title: 'Dashboards Customizáveis',
    description: 'Crie painéis personalizados com widgets de gráficos, métricas e status.',
  },
  {
    icon: Bell,
    title: 'Alertas Inteligentes',
    description: 'Notificações em tempo real quando parâmetros saírem dos limites.',
  },
  {
    icon: LineChart,
    title: 'Análise de Tendências',
    description: 'Visualize padrões e antecipe problemas com análise histórica.',
  },
  {
    icon: Wifi,
    title: 'Múltiplos Protocolos',
    description: 'Suporte a MQTT, HTTP, WebSocket e outros protocolos IoT.',
  },
  {
    icon: Database,
    title: 'Armazenamento Cloud',
    description: 'Dados seguros na nuvem com retenção configurável.',
  },
  {
    icon: Layers,
    title: 'Multi-site',
    description: 'Gerencie múltiplas localidades em uma única interface.',
  },
  {
    icon: Zap,
    title: 'Integração TrakNor',
    description: 'Crie OS automáticas quando alertas forem disparados.',
  },
  {
    icon: Globe,
    title: 'API Completa',
    description: 'REST API para integrações com sistemas externos.',
  },
]

const metrics = [
  { icon: Clock, label: 'Latência média', value: '< 2s' },
  { icon: Database, label: 'Dados processados/dia', value: '10M+' },
  { icon: Bell, label: 'Alertas em tempo real', value: '99.9%' },
  { icon: Globe, label: 'Uptime garantido', value: '99.9%' },
]

const useCases = [
  {
    title: 'Monitoramento de Temperatura',
    description: 'Acompanhe temperatura em tempo real de ambientes climatizados, data centers e câmaras frias.',
  },
  {
    title: 'Controle de Umidade',
    description: 'Monitore níveis de umidade em laboratórios, hospitais e ambientes controlados.',
  },
  {
    title: 'Pressão Diferencial',
    description: 'Gerencie pressão em salas limpas, centros cirúrgicos e áreas de isolamento.',
  },
  {
    title: 'Desempenho de HVAC',
    description: 'Analise eficiência energética e degradação de equipamentos de climatização.',
  },
]

export function TrakSensePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-400 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <Badge variant="secondary">IoT Platform</Badge>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                TrakSense
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                Plataforma de Monitoramento IoT em Tempo Real
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Transforme dados de sensores em insights acionáveis. Dashboards interativos, 
                alertas inteligentes e análise de tendências para seus equipamentos HVAC.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="xl">
                    Agendar Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="xl" variant="outline">
                    Ver Preços
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <Card className="overflow-hidden">
                <div className="h-80 bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center">
                  <div className="w-48 h-32 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                    <Activity className="w-16 h-16 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-8 bg-muted/30 border-y">
        <div className="container-wide">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xl font-bold">{metric.value}</div>
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Monitoramento completo
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para acompanhar a saúde dos seus equipamentos em tempo real.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Casos de Uso</Badge>
            <h2 className="text-3xl font-bold mb-4">
              O que você pode monitorar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="card-hover">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sensor Integration */}
      <section className="section-padding">
        <div className="container-wide text-center">
          <Badge className="mb-4">Sensor Nativo</Badge>
          <h2 className="text-3xl font-bold mb-4">
            Projetado para o AirTrak
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            O TrakSense foi desenvolvido para integração perfeita com nosso sensor AirTrak, 
            mas também suporta sensores de terceiros via API.
          </p>
          <Link to="/produtos/airtrak">
            <Button size="lg" variant="outline">
              Conhecer o AirTrak
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Comece a monitorar agora
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração e veja como o TrakSense pode dar visibilidade 
            total aos seus equipamentos HVAC.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-emerald-600 hover:bg-white/90">
                Agendar Demo Gratuita
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
