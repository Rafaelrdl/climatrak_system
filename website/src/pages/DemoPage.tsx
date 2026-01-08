import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Clock,
  Monitor,
  CheckCircle2,
  ArrowRight,
  Building2,
  Users,
  Wrench
} from 'lucide-react'

const demoSteps = [
  {
    icon: Calendar,
    title: 'Agende',
    description: 'Escolha o melhor horario para sua equipe.',
  },
  {
    icon: Monitor,
    title: 'Assista',
    description: 'Demo personalizada de 30 a 45 minutos.',
  },
  {
    icon: CheckCircle2,
    title: 'Decida',
    description: 'Tire duvidas e avalie sem compromisso.',
  },
]

const demoIncludes = [
  'Visao geral da plataforma TrakNor',
  'Demonstracao do TrakSense IoT',
  'Apresentacao do sensor AirTrak',
  'Simulacao de alertas e dashboards',
  'Analise das necessidades da sua empresa',
  'Proposta personalizada',
]

export function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    employees: '',
    assets: '',
    segment: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement form submission
    console.log('Demo request:', formData)
    alert('Solicitacao enviada! Entraremos em contato para agendar sua demo.')
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Demo gratuita</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Veja a ClimaTrak em acao
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Agende uma demo personalizada e descubra como transformar a gestao dos seus ativos HVAC.
              </p>

              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm">30-45 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  <span className="text-sm">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Gratuita</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {demoSteps.map((step) => (
                  <div key={step.title} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Form */}
            <Card className="shadow-xl">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-6">Solicitar demo</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nome *</label>
                      <Input
                        required
                        placeholder="Seu nome"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">E-mail corporativo *</label>
                      <Input
                        required
                        type="email"
                        placeholder="seu@empresa.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Telefone *</label>
                      <Input
                        required
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Empresa *</label>
                      <Input
                        required
                        placeholder="Nome da empresa"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Numero de funcionarios</label>
                      <select
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.employees}
                        onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="200+">200+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Numero de ativos HVAC</label>
                      <select
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.assets}
                        onChange={(e) => setFormData({ ...formData, assets: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="1-50">1-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Segmento</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.segment}
                      onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="hospital">Hospital / Clinica</option>
                      <option value="industria">Industria</option>
                      <option value="facilities">Facilities / Shopping</option>
                      <option value="manutencao">Empresa de manutencao</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">O que voce gostaria de ver na demo?</label>
                    <textarea
                      rows={3}
                      placeholder="Conte-nos sobre suas necessidades..."
                      className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Solicitar demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao enviar, voce concorda com nossa politica de privacidade.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">O que voce vai ver</Badge>
            <h2 className="text-3xl font-bold mb-4">Na sua demo</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {demoIncludes.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="card-hover">
              <CardContent className="pt-6">
                <Building2 className="w-10 h-10 text-primary mx-auto mb-4" />
                <div className="text-2xl font-bold mb-1">+50</div>
                <p className="text-sm text-muted-foreground">Empresas confiam na ClimaTrak</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="pt-6">
                <Wrench className="w-10 h-10 text-primary mx-auto mb-4" />
                <div className="text-2xl font-bold mb-1">+500</div>
                <p className="text-sm text-muted-foreground">Ativos monitorados</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="pt-6">
                <Users className="w-10 h-10 text-primary mx-auto mb-4" />
                <div className="text-2xl font-bold mb-1">99%</div>
                <p className="text-sm text-muted-foreground">Satisfacao dos clientes</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
