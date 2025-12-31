import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock, User } from 'lucide-react'

const blogPosts = [
  {
    id: 1,
    title: 'Como evitar multas com o PMOC: Guia completo 2025',
    excerpt: 'Entenda as exigências do PMOC e como manter sua empresa em conformidade com a legislação de climatização.',
    category: 'Compliance',
    author: 'Equipe ClimaTrak',
    date: '15 Jan 2025',
    readTime: '8 min',
    image: '/blog/pmoc.jpg',
  },
  {
    id: 2,
    title: 'Manutenção Preditiva vs Preventiva: Qual a melhor estratégia?',
    excerpt: 'Descubra as diferenças entre os tipos de manutenção e quando usar cada abordagem para maximizar a vida útil dos seus equipamentos.',
    category: 'Manutenção',
    author: 'Equipe ClimaTrak',
    date: '10 Jan 2025',
    readTime: '6 min',
    image: '/blog/manutencao.jpg',
  },
  {
    id: 3,
    title: 'IoT na Gestão de Ativos HVAC: O futuro é agora',
    excerpt: 'Como sensores inteligentes e plataformas IoT estão revolucionando a forma de gerenciar equipamentos de climatização.',
    category: 'Tecnologia',
    author: 'Equipe ClimaTrak',
    date: '05 Jan 2025',
    readTime: '7 min',
    image: '/blog/iot.jpg',
  },
  {
    id: 4,
    title: 'KPIs essenciais para gestão de manutenção',
    excerpt: 'Conheça os indicadores-chave que toda empresa deve acompanhar para otimizar a gestão de manutenção.',
    category: 'Gestão',
    author: 'Equipe ClimaTrak',
    date: '28 Dez 2024',
    readTime: '5 min',
    image: '/blog/kpis.jpg',
  },
  {
    id: 5,
    title: 'Redução de custos: Cases de sucesso com CMMS',
    excerpt: 'Histórias reais de empresas que reduziram até 40% dos custos de manutenção com a implementação de um CMMS.',
    category: 'Cases',
    author: 'Equipe ClimaTrak',
    date: '20 Dez 2024',
    readTime: '10 min',
    image: '/blog/cases.jpg',
  },
  {
    id: 6,
    title: 'ANVISA e climatização hospitalar: O que você precisa saber',
    excerpt: 'Requisitos e boas práticas para manter a conformidade dos sistemas HVAC em ambientes hospitalares.',
    category: 'Compliance',
    author: 'Equipe ClimaTrak',
    date: '15 Dez 2024',
    readTime: '9 min',
    image: '/blog/anvisa.jpg',
  },
]

const categories = ['Todos', 'Compliance', 'Manutenção', 'Tecnologia', 'Gestão', 'Cases']

export function BlogPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Blog ClimaTrak</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Insights e Conhecimento
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Artigos, guias e novidades sobre gestão de ativos, manutenção HVAC, 
            IoT e compliance. Conhecimento para transformar sua operação.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container-wide">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === 'Todos' ? 'default' : 'outline'}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Card key={post.id} className="card-hover overflow-hidden group">
                <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                  <span className="text-4xl font-bold text-brand-300">{post.category[0]}</span>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Ver mais artigos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl font-bold mb-4">
                Receba nossos conteúdos
              </h2>
              <p className="text-muted-foreground mb-6">
                Assine nossa newsletter e receba artigos, dicas e novidades sobre 
                gestão de ativos e manutenção diretamente no seu e-mail.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button>Assinar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
