import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Wrench, 
  ClipboardList, 
  Package, 
  Users, 
  BarChart3, 
  Calendar,
  FileText,
  Smartphone,
  Shield,
  Zap
} from 'lucide-react'

const features = [
  {
    icon: ClipboardList,
    title: 'Ordens de Serviço',
    description: 'Crie, atribua e acompanhe OS preventivas e corretivas com workflow completo.',
  },
  {
    icon: Calendar,
    title: 'Manutenção Preventiva',
    description: 'Planos automáticos baseados em tempo, uso ou condição dos equipamentos.',
  },
  {
    icon: Package,
    title: 'Inventário',
    description: 'Controle de peças, insumos e ferramentas com alertas de estoque mínimo.',
  },
  {
    icon: Users,
    title: 'Gestão de Equipes',
    description: 'Atribuição de técnicos, controle de disponibilidade e cargas de trabalho.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & KPIs',
    description: 'MTTR, MTBF, backlog, custos e outros indicadores em tempo real.',
  },
  {
    icon: FileText,
    title: 'Relatórios PMOC',
    description: 'Geração automática de laudos e relatórios para conformidade legal.',
  },
  {
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Aplicativo para técnicos executarem OS em campo com fotos e assinaturas.',
  },
  {
    icon: Shield,
    title: 'Multi-tenant',
    description: 'Arquitetura segura com isolamento de dados por cliente/filial.',
  },
]

const benefits = [
  'Redução de até 40% nos custos de manutenção corretiva',
  'Aumento da vida útil dos equipamentos',
  'Conformidade automática com PMOC e ANVISA',
  'Visibilidade total do parque de ativos',
  'Histórico completo para auditorias',
  'Integração com sensores IoT (TrakSense)',
]

const modules = [
  {
    title: 'Ativos',
    items: ['Cadastro completo', 'Hierarquia de locais', 'QR Code', 'Histórico'],
  },
  {
    title: 'Manutenção',
    items: ['OS preventivas', 'OS corretivas', 'Checklists', 'Procedimentos'],
  },
  {
    title: 'Relatórios',
    items: ['PMOC', 'KPIs', 'Custos', 'Exportação'],
  },
  {
    title: 'Integrações',
    items: ['API REST', 'TrakSense', 'Webhooks', 'ERP'],
  },
]

export function TrakNorPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <Badge variant="secondary">CMMS</Badge>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                TrakNor
              </h1>
              <p className="text-xl text-muted-foreground mb-4">
                Sistema de Gestão de Manutenção Computadorizado
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                Gerencie todo o ciclo de vida dos seus ativos HVAC em uma única plataforma. 
                Desde o cadastro até ordens de serviço, inventário e relatórios de conformidade.
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
                <div className="h-80 bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                  <div className="w-48 h-32 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                    <Wrench className="w-16 h-16 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Tudo para gestão de manutenção
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Módulos completos para gerenciar ativos, equipes, inventário e conformidade.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Benefícios</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Por que escolher o TrakNor?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/demo">
                  <Button size="lg">
                    Solicitar Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {modules.map((module) => (
                <Card key={module.title}>
                  <CardContent className="pt-4 pb-4">
                    <h3 className="font-semibold mb-2">{module.title}</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {module.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="section-padding">
        <div className="container-wide text-center">
          <Badge className="mb-4">Integração</Badge>
          <h2 className="text-3xl font-bold mb-4">
            Melhor ainda com TrakSense
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Conecte o TrakNor à plataforma TrakSense e crie ordens de serviço automaticamente 
            quando os sensores detectarem anomalias nos equipamentos.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Card className="w-32 h-32 flex items-center justify-center">
              <div className="text-center">
                <Wrench className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium">TrakNor</span>
              </div>
            </Card>
            <Zap className="w-8 h-8 text-amber-500" />
            <Card className="w-32 h-32 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <span className="text-sm font-medium">TrakSense</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para modernizar sua gestão?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração e descubra como o TrakNor pode transformar 
            a manutenção dos seus ativos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="xl" variant="secondary" className="bg-white text-blue-600 hover:bg-white/90">
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
