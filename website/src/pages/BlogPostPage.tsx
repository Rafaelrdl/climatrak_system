import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'

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

export function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!slug) return
    const controller = new AbortController()

    const loadPost = async () => {
      try {
        const response = await fetch(`${apiBase}/api/marketing/blog-posts/${encodeURIComponent(slug)}/`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Post nao encontrado')
        }
        const data = await response.json()
        setPost(data)
        setStatus('ready')
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setStatus('error')
      }
    }

    loadPost()
    return () => controller.abort()
  }, [slug])

  const contentBlocks = useMemo(() => {
    if (!post?.content) return []
    return post.content.split(/\n\s*\n/).filter(Boolean)
  }, [post])

  return (
    <div className="flex flex-col">
      <section className="section-padding bg-gradient-hero">
        <div className="container-wide">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao blog
            </Link>
          </Button>

          {status === 'loading' && (
            <div className="space-y-4">
              <div className="h-6 w-32 rounded bg-muted/50 animate-pulse" />
              <div className="h-10 w-3/4 rounded bg-muted/50 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse" />
            </div>
          )}

          {status === 'error' && (
            <div className="text-muted-foreground">
              Nao foi possivel carregar este post.
            </div>
          )}

          {status === 'ready' && post && (
            <div>
              <Badge className="mb-4">{post.category}</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {post.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                {post.excerpt}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.published_at || post.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {post.read_time_minutes ?? 5} min
                </span>
                <span>Por {post.author_name}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {status === 'ready' && post && (
        <section className="section-padding">
          <div className="container-narrow space-y-8">
            <div className="rounded-2xl overflow-hidden border bg-muted/40">
              {post.image_url ? (
                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-brand-400 text-lg font-semibold">
                  {post.title}
                </div>
              )}
            </div>

            <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
              {contentBlocks.map((block, index) => (
                <p key={index}>{block}</p>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-primary/20 bg-muted/40 p-4 text-sm text-muted-foreground">
              Quer compartilhar um caso ou sugestao? Envie para nosso time e ajude a definir os proximos temas.
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
