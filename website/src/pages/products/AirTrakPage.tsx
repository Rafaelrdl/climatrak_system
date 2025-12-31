import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Cpu, 
  Thermometer, 
  Droplets, 
  Gauge,
  Wifi,
  Battery,
  Shield,
  Zap,
  Settings,
  Package
} from 'lucide-react'

const specs = [
  {
    icon: Thermometer,
    label: 'Temperatura',
    value: '-40°C a +125°C',
    precision: '±0.5°C',
  },
  {
    icon: Droplets,
    label: 'Umidade',
    value: '0% a 100% RH',
    precision: '±2%',
  },
  {
    icon: Gauge,
    label: 'Pressão',
    value: '0 a 10 bar',
    precision: '±0.1%',
  },
  {
    icon: Wifi,
    label: 'Conectividade',
    value: 'WiFi / LoRa',
    precision: 'Dual-band',
  },
  {
    icon: Battery,
    label: 'Bateria',
    value: '2+ anos',
    precision: 'Ou alimentado',
  },
  {
    icon: Shield,
    label: 'Proteção',
    value: 'IP65',
    precision: 'Industrial',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Plug & Play',
    description: 'Instalação em minutos, sem configuração complexa. Basta ligar e conectar.',
  },
  {
    icon: Settings,
    title: 'Calibração Automática',
    description: 'Sensores auto-calibráveis com verificação periódica de precisão.',
  },
  {
    icon: Wifi,
    title: 'Conectividade Dupla',
    description: 'WiFi para ambientes corporativos, LoRa para locais remotos.',
  },
  {
    icon: Shield,
    title: 'Design Industrial',
    description: 'Construído para ambientes hostis com proteção IP65.',
  },
  {
    icon: Battery,
    title: 'Longa Autonomia',
    description: 'Até 2 anos com bateria ou alimentação contínua.',
  },
  {
    icon: Package,
    title: 'Compacto',
    description: 'Design discreto que se adapta a qualquer ambiente.',
  },
]

const applications = [
  'Chillers e condensadoras',
  'Fancoils e VRFs',
  'Câmaras frias',
  'Data centers',
  'Salas limpas',
  'Centros cirúrgicos',
  'Laboratórios',
  'Ambientes controlados',
]

export function AirTrakPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div>
                  <Badge variant="secondary">Smart Sensor</Badge>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                AirTrak
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                Sensor Inteligente para Equipamentos HVAC
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Monitore temperatura, umidade e pressão dos seus equipamentos de climatização 
                com precisão industrial e conectividade em tempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="xl">
                    Solicitar Orçamento
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/produtos/traksense">
                  <Button size="xl" variant="outline">
                    Ver TrakSense
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <Card className="overflow-hidden">
                <div className="h-80 bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center">
                  <div className="w-32 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <Cpu className="w-16 h-16 text-violet-600" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Specs Grid */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Especificações</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Precisão industrial
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido para ambientes exigentes com certificações e precisão de nível industrial.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {specs.map((spec) => (
              <Card key={spec.label} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <spec.icon className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{spec.label}</div>
                      <div className="font-bold">{spec.value}</div>
                      <div className="text-sm text-violet-600">{spec.precision}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Características</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Projetado para facilitar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Aplicações</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Onde usar o AirTrak
              </h2>
              <p className="text-muted-foreground mb-6">
                O AirTrak foi projetado para monitorar qualquer equipamento de climatização 
                ou ambiente que necessite controle de temperatura, umidade ou pressão.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {applications.map((app) => (
                  <div key={app} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-violet-500 flex-shrink-0" />
                    <span>{app}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="overflow-hidden">
              <div className="h-80 bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Thermometer className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Droplets className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Gauge className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Wifi className="w-10 h-10 text-violet-400" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Important Note */}
      <section className="section-padding bg-violet-50">
        <div className="container-wide">
          <Card className="max-w-3xl mx-auto border-violet-200">
            <CardContent className="pt-6 text-center">
              <Cpu className="w-12 h-12 text-violet-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                AirTrak + TrakSense = Solução Completa
              </h3>
              <p className="text-muted-foreground mb-4">
                O sensor AirTrak é sempre comercializado junto com a plataforma TrakSense. 
                Nunca vendemos o hardware separadamente, garantindo uma experiência integrada completa.
              </p>
              <Link to="/precos">
                <Button>Ver Preços da Solução Completa</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-violet-600 to-violet-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para sensorizar seus ativos?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Entre em contato para um orçamento personalizado baseado no número 
            de equipamentos que você precisa monitorar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-violet-600 hover:bg-white/90">
                Solicitar Orçamento
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
