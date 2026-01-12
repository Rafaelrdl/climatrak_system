import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, Layers, AlertTriangle } from 'lucide-react'
import { functionalities, personaSections, productModules } from '@/content/marketingStructure'

const moduleById = Object.fromEntries(productModules.map((module) => [module.id, module]))
const groupById = Object.fromEntries(personaSections.map((section) => [section.id, section]))

export function FunctionalityPage() {
  const { slug } = useParams()
  const functionality = functionalities.find((feature) => feature.slug === slug)

  if (!functionality) {
    return (
      <div className="section-padding">
        <div className="container-wide text-center">
          <div className="max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Funcionalidade nao encontrada</h1>
            <p className="text-muted-foreground mb-6">
              A pagina que voce procura nao existe ou foi movida.
            </p>
            <Link to="/funcionalidades">
              <Button>
                Ver todas as funcionalidades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const group = groupById[functionality.group]
  const related = functionalities
    .filter((feature) => feature.group === functionality.group && feature.slug !== functionality.slug)
    .slice(0, 3)

  return (
    <div className="flex flex-col">
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">{group?.name ?? 'Funcionalidades'}</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">{functionality.name}</h1>
            <p className="text-xl text-muted-foreground mb-6">{functionality.tagline}</p>
            <p className="text-lg text-muted-foreground">{functionality.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {functionality.modules.map((moduleId) => {
                const module = moduleById[moduleId]
                return (
                  <Badge key={moduleId} variant="secondary">
                    {module?.name ?? moduleId}
                  </Badge>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div className="rounded-2xl border border-dashed border-primary/30 bg-muted/40 p-3">
              <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-primary/10 via-white to-primary/5 flex items-center justify-center text-sm text-muted-foreground">
                Espaco para print ou gif da tela
              </div>
            </div>
            <div>
              <Badge variant="secondary" className="mb-3">Visual</Badge>
              <h2 className="text-2xl font-bold mb-3">Como aparece na plataforma</h2>
              <p className="text-muted-foreground mb-4">
                Use este espaco para demonstrar o fluxo real. Substitua o placeholder por um print ou gif da funcionalidade.
              </p>
              <div className="space-y-2">
                {functionality.outcomes.slice(0, 2).map((outcome) => (
                  <div key={outcome} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Destaques</h2>
                </div>
                <div className="space-y-4">
                  {functionality.highlights.map((highlight) => (
                    <div key={highlight.title}>
                      <div className="font-semibold mb-1">{highlight.title}</div>
                      <p className="text-sm text-muted-foreground">{highlight.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Resultados esperados</h2>
                </div>
                <div className="space-y-3">
                  {functionality.outcomes.map((outcome) => (
                    <div key={outcome} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      <span className="text-muted-foreground">{outcome}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Modulos conectados</Badge>
            <h2 className="text-3xl font-bold mb-4">Onde essa funcionalidade vive</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore os modulos que suportam esta funcionalidade e entenda como ela se encaixa
              na operacao completa.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {functionality.modules.map((moduleId) => {
              const module = moduleById[moduleId]
              return (
                <Card key={moduleId} className="card-hover">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2">{module?.name ?? moduleId}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Integra dados da operacao para manter equipes e clientes alinhados.
                    </p>
                    {'websiteHref' in (module || {}) && (module as { websiteHref?: string })?.websiteHref && (
                      <Link to={(module as { websiteHref: string }).websiteHref} className="inline-flex items-center text-primary font-medium">
                        Ver produto
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-padding">
          <div className="container-wide">
            <div className="text-center mb-12">
              <Badge className="mb-4">Relacionado</Badge>
              <h2 className="text-3xl font-bold mb-4">Outras funcionalidades do mesmo perfil</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((feature) => (
                <Card key={feature.id} className="card-hover">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{feature.tagline}</p>
                    <Link to={`/funcionalidades/${feature.slug}`} className="inline-flex items-center text-primary font-medium">
                      Ver detalhes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-padding bg-gradient-brand text-white">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Pronto para ativar essa funcionalidade?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Agende uma demo e veja como adaptar a plataforma ao seu fluxo de trabalho.
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
