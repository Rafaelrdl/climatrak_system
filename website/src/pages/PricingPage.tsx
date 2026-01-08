import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, ArrowRight, HelpCircle } from 'lucide-react'

const traknorPlans = [
  {
    name: 'Essencial',
    description: 'Para equipes pequenas e operacoes iniciais',
    price: 'R$ 149',
    period: '/mes',
    assets: 'Ate 50 ativos',
    users: '2 usuarios',
    features: [
      'Ordens de servico e ativos',
      'Planos preventivos basicos',
      'Relatorios essenciais',
      'App mobile',
      'Suporte por email',
    ],
    highlighted: false,
  },
  {
    name: 'Crescimento',
    description: 'Para operacoes em expansao',
    price: 'R$ 399',
    period: '/mes',
    assets: 'Ate 200 ativos',
    users: '5 usuarios',
    features: [
      'Tudo do plano Essencial',
      'Planos preventivos automaticos',
      'Relatorios PMOC',
      'Gestao de inventario',
      'Dashboard avancado',
      'Suporte prioritario',
    ],
    highlighted: true,
  },
  {
    name: 'Profissional',
    description: 'Para operacoes em escala',
    price: 'R$ 799',
    period: '/mes',
    assets: 'Ate 500 ativos',
    users: '15 usuarios',
    features: [
      'Tudo do plano Crescimento',
      'Multiplos locais',
      'API de integracao',
      'Relatorios customizados',
      'Gestao de SLA',
      'Treinamento online',
    ],
    highlighted: false,
  },
  {
    name: 'Enterprise',
    description: 'Para grandes operacoes',
    price: 'Sob consulta',
    period: '',
    assets: 'Ativos ilimitados',
    users: 'Usuarios ilimitados',
    features: [
      'Tudo do plano Profissional',
      'SSO/SAML',
      'Ambiente dedicado',
      'SLA premium',
      'Integracoes customizadas',
      'Gerente de sucesso dedicado',
    ],
    highlighted: false,
  },
]

const traksensePricing = [
  { range: '1-19 sensores', price: 'R$ 220', unit: '/sensor/mes' },
  { range: '20-99 sensores', price: 'R$ 180', unit: '/sensor/mes' },
  { range: '100-299 sensores', price: 'R$ 150', unit: '/sensor/mes' },
  { range: '300+ sensores', price: 'R$ 130', unit: '/sensor/mes' },
]

const faqs = [
  {
    question: 'Posso contratar TrakSense separadamente?',
    answer: 'Sim. O TrakSense pode ser contratado sem o TrakNor, mas o AirTrak opera com a plataforma TrakSense.',
  },
  {
    question: 'O que esta incluso no sensor AirTrak?',
    answer: 'Cada sensor inclui hardware, conectividade, cloud, dashboards e alertas inteligentes.',
  },
  {
    question: 'Existe fidelidade contratual?',
    answer: 'Nao ha fidelidade. Planos anuais tem desconto, e o cancelamento pode ser feito a qualquer momento.',
  },
  {
    question: 'Como funciona o onboarding?',
    answer: 'Inclui treinamento da equipe, configuracao inicial e migracao quando aplicavel.',
  },
  {
    question: 'Locais extras sao cobrados?',
    answer: 'Nao. Voce pode cadastrar locais ilimitados em qualquer plano do TrakNor.',
  },
]

export function PricingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Precos transparentes</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Planos para cada necessidade
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para sua operacao. Sem surpresas e sem taxas escondidas.
          </p>
        </div>
      </section>

      {/* TrakNor Pricing */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">TrakNor CMMS</Badge>
            <h2 className="text-3xl font-bold mb-4">Sistema de gestao de manutencao</h2>
            <p className="text-muted-foreground">Licenciamento SaaS por numero de ativos</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {traknorPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Mais popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="font-medium">{plan.assets}</div>
                    <div className="text-muted-foreground">{plan.users}</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/demo">
                    <Button className="w-full" variant={plan.highlighted ? 'default' : 'outline'}>
                      {plan.price === 'Sob consulta' ? 'Falar com vendas' : 'Comecar agora'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Usuario extra: R$ 30/mes - Locais extras: ilimitados
          </p>
        </div>
      </section>

      {/* TrakSense Pricing */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">TrakSense + AirTrak</Badge>
            <h2 className="text-3xl font-bold mb-4">Monitoramento IoT</h2>
            <p className="text-muted-foreground">Preco por sensor com escala de volume</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  {traksensePricing.map((tier) => (
                    <div key={tier.range} className="p-4 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground mb-1">{tier.range}</div>
                      <div className="text-2xl font-bold">{tier.price}</div>
                      <div className="text-sm text-muted-foreground">{tier.unit}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-medium mb-2">O que esta incluso:</h4>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Sensor AirTrak
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Conectividade
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Cloud e storage
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Dashboards
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Alertas inteligentes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Manutencao remota
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold mb-4">Perguntas frequentes</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium mb-2">{faq.question}</h3>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
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
            Ainda tem duvidas?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Nossa equipe esta pronta para ajudar voce a encontrar o plano ideal.
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
                Falar com vendas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
