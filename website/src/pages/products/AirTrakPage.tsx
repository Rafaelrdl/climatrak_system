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
    value: '-40C a +125C',
    precision: '+/- 0.5C',
  },
  {
    icon: Droplets,
    label: 'Umidade',
    value: '0% a 100% RH',
    precision: '+/- 2%',
  },
  {
    icon: Gauge,
    label: 'Pressao',
    value: '0 a 10 bar',
    precision: '+/- 0.1%',
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
    label: 'Protecao',
    value: 'IP65',
    precision: 'Industrial',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Plug and play',
    description: 'Instalacao em minutos, sem configuracao complexa.',
  },
  {
    icon: Settings,
    title: 'Calibracao automatica',
    description: 'Sensores auto calibraveis com verificacao periodica.',
  },
  {
    icon: Wifi,
    title: 'Conectividade dupla',
    description: 'WiFi para ambientes corporativos e LoRa para locais remotos.',
  },
  {
    icon: Shield,
    title: 'Design industrial',
    description: 'Construido para ambientes hostis com protecao IP65.',
  },
  {
    icon: Battery,
    title: 'Longa autonomia',
    description: 'Ate 2 anos com bateria ou alimentacao continua.',
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
  'Camaras frias',
  'Data centers',
  'Salas limpas',
  'Centros cirurgicos',
  'Laboratorios',
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-400 flex items-center justify-center">
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
                Sensor inteligente para equipamentos HVAC
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Monitore temperatura, umidade e pressao com precisao industrial e conectividade em tempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="xl">
                    Solicitar orcamento
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
                <div className="h-80 bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center">
                  <div className="w-32 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <Cpu className="w-16 h-16 text-teal-600" />
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
            <Badge className="mb-4">Especificacoes</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Precisao industrial
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido para ambientes exigentes com certificacoes e precisao de nivel industrial.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {specs.map((spec) => (
              <Card key={spec.label} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <spec.icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{spec.label}</div>
                      <div className="font-bold">{spec.value}</div>
                      <div className="text-sm text-teal-600">{spec.precision}</div>
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
            <Badge className="mb-4">Caracteristicas</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Projetado para facilitar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-teal-600" />
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
              <Badge className="mb-4">Aplicacoes</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Onde usar o AirTrak
              </h2>
              <p className="text-muted-foreground mb-6">
                O AirTrak monitora equipamentos de climatizacao e ambientes que exigem controle de temperatura,
                umidade ou pressao.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {applications.map((app) => (
                  <div key={app} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />
                    <span>{app}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="overflow-hidden">
              <div className="h-80 bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Thermometer className="w-10 h-10 text-teal-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Droplets className="w-10 h-10 text-teal-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Gauge className="w-10 h-10 text-teal-400" />
                  </div>
                  <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center">
                    <Wifi className="w-10 h-10 text-teal-400" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Important Note */}
      <section className="section-padding bg-teal-50">
        <div className="container-wide">
          <Card className="max-w-3xl mx-auto border-teal-200">
            <CardContent className="pt-6 text-center">
              <Cpu className="w-12 h-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                AirTrak + TrakSense = solucao completa
              </h3>
              <p className="text-muted-foreground mb-4">
                O sensor AirTrak e comercializado junto com a plataforma TrakSense para garantir
                uma experiencia integrada e confiavel.
              </p>
              <Link to="/precos">
                <Button>Ver precos da solucao completa</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para sensorizar seus ativos?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Entre em contato para um orcamento baseado no numero de equipamentos a monitorar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-teal-600 hover:bg-white/90">
                Solicitar orcamento
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
