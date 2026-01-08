import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

type BlogPost = {
  id: number
  title: string
  slug: string
  category: string
}

type FormState = {
  title: string
  slug: string
  category: string
  author_name: string
  image_url: string
  read_time_minutes: string
  excerpt: string
  content: string
  status: 'draft' | 'published'
}

const apiBase = import.meta.env.VITE_MARKETING_API_URL ?? ''

export function BlogEditorPage() {
  const [form, setForm] = useState<FormState>({
    title: '',
    slug: '',
    category: '',
    author_name: 'Equipe ClimaTrak',
    image_url: '',
    read_time_minutes: '',
    excerpt: '',
    content: '',
    status: 'draft',
  })
  const [editorKey, setEditorKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdPost, setCreatedPost] = useState<BlogPost | null>(null)

  useEffect(() => {
    const savedKey = window.localStorage.getItem('marketingEditorKey')
    if (savedKey) setEditorKey(savedKey)
  }, [])

  useEffect(() => {
    if (editorKey) {
      window.localStorage.setItem('marketingEditorKey', editorKey)
    }
  }, [editorKey])

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setCreatedPost(null)

    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || undefined,
      category: form.category,
      author_name: form.author_name,
      image_url: form.image_url || undefined,
      excerpt: form.excerpt,
      content: form.content,
      status: form.status,
    }

    if (form.read_time_minutes) {
      payload.read_time_minutes = Number(form.read_time_minutes)
    }

    try {
      const response = await fetch(`${apiBase}/api/marketing/blog-posts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(editorKey ? { 'X-Marketing-Key': editorKey } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message = data?.detail || 'Falha ao criar o post'
        throw new Error(message)
      }

      const created = await response.json()
      setCreatedPost(created)
      setForm({
        title: '',
        slug: '',
        category: '',
        author_name: form.author_name,
        image_url: '',
        read_time_minutes: '',
        excerpt: '',
        content: '',
        status: 'draft',
      })
    } catch (submitError) {
      setError((submitError as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <section className="section-padding bg-gradient-hero">
        <div className="container-narrow">
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao blog
            </Link>
          </Button>
          <Badge className="mb-4">Nova novidade</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Publicar no blog</h1>
          <p className="text-lg text-muted-foreground">
            Adicione novidades, guias e anuncios. Use a chave de editor para liberar o envio.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-narrow">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="editorKey">Chave do editor</label>
                  <input
                    id="editorKey"
                    type="password"
                    value={editorKey}
                    onChange={(event) => setEditorKey(event.target.value)}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    placeholder="Informe a chave de publicacao"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="title">Titulo</label>
                  <input
                    id="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange('title')}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    placeholder="Ex: Manutencao preditiva em HVAC"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="slug">Slug (opcional)</label>
                    <input
                      id="slug"
                      type="text"
                      value={form.slug}
                      onChange={handleChange('slug')}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                      placeholder="ex: manutencao-preditiva-hvac"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="category">Categoria</label>
                    <input
                      id="category"
                      type="text"
                      value={form.category}
                      onChange={handleChange('category')}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                      placeholder="Ex: Manutencao"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="author">Autor</label>
                    <input
                      id="author"
                      type="text"
                      value={form.author_name}
                      onChange={handleChange('author_name')}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                      placeholder="Equipe ClimaTrak"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="readTime">Tempo de leitura (min)</label>
                    <input
                      id="readTime"
                      type="number"
                      min={1}
                      value={form.read_time_minutes}
                      onChange={handleChange('read_time_minutes')}
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                      placeholder="Ex: 6"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="imageUrl">URL da imagem (opcional)</label>
                  <input
                    id="imageUrl"
                    type="url"
                    value={form.image_url}
                    onChange={handleChange('image_url')}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="excerpt">Resumo</label>
                  <textarea
                    id="excerpt"
                    value={form.excerpt}
                    onChange={handleChange('excerpt')}
                    className="min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    placeholder="Resumo curto para a listagem"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="content">Conteudo completo</label>
                  <textarea
                    id="content"
                    value={form.content}
                    onChange={handleChange('content')}
                    className="min-h-[220px] w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                    placeholder="Escreva o conteudo do post aqui"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={handleChange('status')}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {createdPost && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Post criado. <Link to={`/blog/${createdPost.slug}`} className="underline">Ver no blog</Link>
                  </div>
                )}

                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Publicando...' : 'Publicar novidade'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
