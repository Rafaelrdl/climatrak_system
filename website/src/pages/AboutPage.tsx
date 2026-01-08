import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Target, Eye, Rocket, Users, Lightbulb, Heart } from 'lucide-react'

const values = [
  {
    icon: Target,
    title: 'Foco no cliente',
    description: 'Cada decisao parte de uma pergunta simples: isso melhora a operacao do cliente?',
  },
  {
    icon: Lightbulb,
    title: 'Inovacao aplicada',
    description: 'Tecnologia com impacto real em custo, confiabilidade e compliance.',
  },
  {
    icon: Users,
    title: 'Parceria',
    description: 'Nao somos apenas fornecedores. Somos parceiros no resultado.',
  },
  {
    icon: Heart,
    title: 'Excelencia',
    description: 'Qualidade no produto, no suporte e na evolucao continua.',
  },
]

const timeline = [
  {
    year: '2023',
    title: 'Fundacao',
    description: 'A ClimaTrak nasce para modernizar a gestao de ativos HVAC no Brasil.',
  },
  {
    year: '2024',
    title: 'Lancamento TrakNor',
    description: 'Primeira versao do CMMS focada em empresas de manutencao.',
  },
  {
    year: '2024',
    title: 'TrakSense + AirTrak',
    description: 'Plataforma IoT e sensor inteligente entram em operacao.',
  },
  {
    year: '2025',
    title: 'Expansao',
    description: 'Novos segmentos, novas funcionalidades e crescimento acelerado.',
  },
]

const team = [
  {
    name: 'Rafael Ribeiro',
    role: 'CEO & Co-founder',
    bio: 'Engenheiro com experiencia em automacao industrial e IoT.',
  },
  {
    name: 'Time de Desenvolvimento',
    role: 'Engenharia',
    bio: 'Equipe especializada em React, Django, IoT e sistemas distribuidos.',
  },
  {
    name: 'Time Comercial',
    role: 'Vendas & CS',
    bio: 'Especialistas em HVAC e manutencao predial, focados no sucesso do cliente.',
  },
]

export function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Sobre nos</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Transformando ativos em{' '}
                <span className="text-gradient">inteligencia operacional</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                A ClimaTrak combina software, IoT e experiencia de campo para ajudar empresas
                a reduzir falhas, custos e riscos regulatorio em operacoes HVAC.
              </p>
            </div>
            <div className="relative">
              <Card className="overflow-hidden">
                <div className="h-80 bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl font-bold mb-2">C</div>
                    <div className="text-xl font-semibold">ClimaTrak</div>
                    <div className="text-sm opacity-80">Tecnologia Ltda.</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Nossa missao</h2>
                <p className="text-muted-foreground">
                  Democratizar o acesso a gestao de ativos com visibilidade, controle e decisao baseada em dados.
                </p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Nossa visao</h2>
                <p className="text-muted-foreground">
                  Ser a plataforma de referencia em gestao HVAC na America Latina, reconhecida pela inovacao e impacto real.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Valores</Badge>
            <h2 className="text-3xl font-bold mb-4">O que nos guia</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="card-hover text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Nossa historia</Badge>
            <h2 className="text-3xl font-bold mb-4">Linha do tempo</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-8">
                {timeline.map((item) => (
                  <div key={item.year} className="relative pl-12">
                    <div className="absolute left-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Rocket className="w-4 h-4 text-white" />
                    </div>
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="secondary">{item.year}</Badge>
                          <h3 className="font-semibold">{item.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Equipe</Badge>
            <h2 className="text-3xl font-bold mb-4">Quem faz acontecer</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {team.map((member) => (
              <Card key={member.name} className="card-hover text-center">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-brand mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
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
            Quer fazer parte dessa historia?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Estamos sempre em busca de talentos e parceiros que compartilhem nossa visao.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contato">
              <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Entre em contato
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
