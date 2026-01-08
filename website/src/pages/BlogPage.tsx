import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Clock } from 'lucide-react'

type BlogPost = {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  author_name: string
  image_url?: string
  read_time_minutes?: number
  published_at?: string
  created_at?: string
}

const apiBase = import.meta.env.VITE_MARKETING_API_URL ?? ''

const formatDate = (value?: string) => {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeCategory, setActiveCategory] = useState('Todos')

  useEffect(() => {
    const controller = new AbortController()

    const loadPosts = async () => {
      try {
        const response = await fetch(`${apiBase}/api/marketing/blog-posts/`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Falha ao carregar posts')
        }
        const data = await response.json()
        const items = Array.isArray(data) ? data : data.results ?? []
        setPosts(items)
        setStatus('ready')
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setStatus('error')
      }
    }

    loadPosts()
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))
    return ['Todos', ...unique]
  }, [posts])

  useEffect(() => {
    if (activeCategory === 'Todos') return
    if (!posts.some((post) => post.category === activeCategory)) {
      setActiveCategory('Todos')
    }
  }, [activeCategory, posts])

  const filteredPosts = activeCategory === 'Todos'
    ? posts
    : posts.filter((post) => post.category === activeCategory)

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide text-center">
          <Badge className="mb-4">Blog ClimaTrak</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Insights e conhecimento
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Artigos, guias e novidades sobre gestao de ativos, manutencao HVAC e IoT.
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
                variant={category === activeCategory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category)}
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
          {status === 'error' && (
            <div className="text-center text-muted-foreground">
              Nao foi possivel carregar os posts agora. Tente novamente em instantes.
            </div>
          )}

          {status === 'loading' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="h-48 bg-muted/50 animate-pulse" />
                  <CardContent className="pt-6 space-y-3">
                    <div className="h-4 w-24 rounded bg-muted/50 animate-pulse" />
                    <div className="h-5 w-3/4 rounded bg-muted/50 animate-pulse" />
                    <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-muted/50 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {status === 'ready' && filteredPosts.length === 0 && (
            <div className="text-center text-muted-foreground">
              Nenhum post encontrado para esta categoria.
            </div>
          )}

          {status === 'ready' && filteredPosts.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="block group">
                  <Card className="card-hover overflow-hidden">
                    <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center overflow-hidden">
                      {post.image_url ? (
                        <img src={post.image_url} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-brand-300">{post.category?.[0] ?? post.title[0]}</span>
                      )}
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
                            {formatDate(post.published_at || post.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.read_time_minutes ?? 5} min
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {status === 'ready' && filteredPosts.length > 0 && (
            <div className="text-center mt-12">
              <Link to="/contato">
                <Button variant="outline" size="lg">
                  Sugerir tema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="section-padding bg-muted/30">
        <div className="container-wide">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl font-bold mb-4">
                Receba nossos conteudos
              </h2>
              <p className="text-muted-foreground mb-6">
                Assine a newsletter e receba artigos, dicas e novidades no seu e-mail.
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
