import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, Layers } from 'lucide-react'
import { functionalities, personaSections, productModules } from '@/content/marketingStructure'

const moduleById = Object.fromEntries(productModules.map((module) => [module.id, module]))

const groupedSections = personaSections.map((section) => ({
  ...section,
  items: functionalities.filter((feature) => feature.group === section.id),
}))

export function FunctionalitiesPage() {
  return (
    <div className="flex flex-col">
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Funcionalidades</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Tudo o que a operacao precisa, conectado
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organize o trabalho interno, mantenha clientes informados e controle custos em uma
            plataforma unica. Cada funcionalidade conversa com as outras para reduzir falhas e
            acelerar resultados.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide space-y-16">
          {groupedSections.map((section) => (
            <div key={section.id}>
              <div className="mb-10">
                <Badge variant="secondary" className="mb-3">{section.name}</Badge>
                <h2 className="text-3xl font-bold mb-3">{section.description}</h2>
                <p className="text-muted-foreground max-w-2xl">
                  Escolha as funcionalidades certas para o seu fluxo e conecte tudo em um unico lugar.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((feature) => (
                  <Card key={feature.id} className="card-hover">
                    <CardContent className="pt-6">
                      <div className="mb-4 rounded-xl border border-dashed border-primary/20 bg-muted/40 p-2">
                        <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center text-xs text-muted-foreground">
                          Espaco para print ou gif
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{feature.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{feature.tagline}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{feature.summary}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {feature.modules.map((moduleId) => {
                          const module = moduleById[moduleId]
                          return (
                            <Badge key={moduleId} variant="secondary">
                              {module?.name ?? moduleId}
                            </Badge>
                          )
                        })}
                      </div>
                      <div className="space-y-2 mb-5">
                        {feature.outcomes.slice(0, 2).map((outcome) => (
                          <div key={outcome} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                            <span>{outcome}</span>
                          </div>
                        ))}
                      </div>
                      <Link to={`/funcionalidades/${feature.slug}`} className="inline-flex items-center text-primary font-medium">
                        Ver detalhes
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Plataforma conectada</Badge>
            <h2 className="text-3xl font-bold mb-4">Funcionalidades que falam entre si</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dados de campo, custos e atendimento fluem entre os modulos para criar uma operacao
              previsivel e com visibilidade total.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {productModules
              .filter((module) => module.websiteHref)
              .map((module) => (
                <Card key={module.id} className="card-hover">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2">{module.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Conecte este modulo as funcionalidades que sua equipe precisa hoje.
                    </p>
                    <Link to={module.websiteHref ?? '/produtos'} className="inline-flex items-center text-primary font-medium">
                      Ver produto
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-gradient-brand text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para ver tudo funcionando junto?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demo e monte a combinacao certa de funcionalidades para o seu negocio.
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
