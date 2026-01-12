import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  Check, 
  DollarSign, 
  PiggyBank,
  FileText,
  Target,
  BarChart3,
  Wallet,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Filter,
  Calendar,
  Wrench,
  Activity,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Screen mockup component
function ScreenMockup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl overflow-hidden shadow-2xl border bg-white border-gray-200", className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50 border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center text-sm font-medium text-gray-600">{title}</div>
        <div className="w-16" />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

// Module screens data
const moduleScreens = [
  {
    id: 'painel',
    name: 'Painel',
    icon: BarChart3,
    description: 'Dashboard completo com orcamento, realizado, comprometido e economias.',
    features: ['Orcamento vs realizado', 'Gastos por categoria', 'Tendencias mensais', 'Top ativos por custo', 'Alertas de orcamento'],
  },
  {
    id: 'orcamentos',
    name: 'Orcamentos',
    icon: Target,
    description: 'Planos anuais e envelopes por categoria com metas mensais.',
    features: ['Planos anuais', 'Envelopes por centro de custo', 'Grade mensal planejada', 'Contingencia e revisoes', 'Aprovacoes por etapa'],
  },
  {
    id: 'lancamentos',
    name: 'Lancamentos',
    icon: FileText,
    description: 'Ledger com lancamentos de manutencao, filtros e rastreabilidade por OS.',
    features: ['Historico completo', 'Filtros por periodo/categoria', 'Exportacao Excel/PDF', 'Vinculo com OS', 'Compromissos futuros'],
  },
  {
    id: 'compromissos',
    name: 'Compromissos',
    icon: Wallet,
    description: 'Fluxo de compromissos com anexos e impacto direto no budget.',
    features: ['Criacao com anexos', 'Submit, approve e cancel', 'Impacto no budget do mes', 'Status por etapa', 'Alertas de estouro'],
  },
  {
    id: 'economia',
    name: 'Economia',
    icon: PiggyBank,
    description: 'Documente economias da manutencao preditiva com ROI calculado.',
    features: ['Registro de economias', 'Calculo de ROI', 'Falhas evitadas', 'Downtime prevenido', 'Relatorios gerenciais'],
  },
  {
    id: 'configuracoes',
    name: 'Configuracoes',
    icon: Wrench,
    description: 'Cadastre centros de custo, categorias e regras financeiras.',
    features: ['Centros de custo', 'Categorias e rate cards', 'Regras simples de alocacao', 'Permissoes por perfil', 'Parametros de integracao'],
  },
]

const kpis = [
  { label: 'Orçamento', value: 'R$ 850k', icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-100' },
  { label: 'Comprometido', value: 'R$ 620k', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Realizado', value: 'R$ 485k', icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-100' },
  { label: 'Economia', value: 'R$ 124k', icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-100' },
]

export function TrakLedgerPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const activeModule = moduleScreens[activeIndex]
  const nextModule = moduleScreens[(activeIndex + 1) % moduleScreens.length]

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % moduleScreens.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [isPaused])

  const handlePrev = () => {
    setActiveIndex((current) => (current - 1 + moduleScreens.length) % moduleScreens.length)
  }

  const handleNext = () => {
    setActiveIndex((current) => (current + 1) % moduleScreens.length)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-white to-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-teal-100 text-teal-700">Finance</Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                TrakLedger: <span className="text-teal-600">Saiba exatamente onde está cada centavo.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                O único sistema de manutenção que prova ROI com números reais.
              </p>
              <p className="text-lg text-gray-500 mb-6">
                Orçamento, realizado, compromissos e economias — tudo conectado a cada OS. 
                <strong> Mostre valor para a diretoria com dados concretos.</strong>
              </p>
              
              {/* Quick stats */}
              <div className="flex gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">R$ 2.4M</div>
                  <div className="text-xs text-gray-500">Economias documentadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">100%</div>
                  <div className="text-xs text-gray-500">Rastreabilidade</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">1 clique</div>
                  <div className="text-xs text-gray-500">Relatório de ROI</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Ver demonstração <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="lg" variant="outline">Ver Planos</Button>
                </Link>
              </div>
              
              <p className="mt-4 text-sm text-gray-500">
                ✓ Integrado ao TrakNor  ✓ Lançamentos automáticos  ✓ Relatórios gerenciais
              </p>
            </div>
            
            {/* Hero Screen Mockup */}
            <ScreenMockup title="TrakLedger — Painel TrakLedgeriro">
              <div className="p-4 bg-gray-50 min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Dezembro 2025</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs"><Filter className="w-3 h-3 mr-1" /> Filtrar</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="w-3 h-3 mr-1" /> Exportar</Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {kpis.map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-lg p-3 border shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("p-1 rounded", kpi.bg)}>
                          <kpi.icon className={cn("w-3 h-3", kpi.color)} />
                        </div>
                        <span className="text-xs text-gray-500">{kpi.label}</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-lg p-4 border shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">Gastos por Mês</div>
                    <div className="flex items-end gap-2 h-32">
                      {[
                        { m: 'Jan', p: 45, r: 38 },
                        { m: 'Fev', p: 52, r: 48 },
                        { m: 'Mar', p: 48, r: 51 },
                        { m: 'Abr', p: 55, r: 45 },
                        { m: 'Mai', p: 50, r: 47 },
                        { m: 'Jun', p: 58, r: 52 },
                        { m: 'Jul', p: 45, r: 42 },
                        { m: 'Ago', p: 62, r: 55 },
                        { m: 'Set', p: 55, r: 50 },
                        { m: 'Out', p: 68, r: 58 },
                        { m: 'Nov', p: 72, r: 62 },
                        { m: 'Dez', p: 65, r: 45 },
                      ].map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full flex gap-0.5">
                            <div className="flex-1 bg-teal-300 rounded-t" style={{ height: `${d.p}%` }} />
                            <div className="flex-1 bg-teal-500 rounded-t" style={{ height: `${d.r}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{d.m}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-300 rounded" /> Planejado</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-500 rounded" /> Realizado</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">Por Categoria</div>
                    <div className="space-y-3">
                      {[
                        { cat: 'Preventiva', pct: 48, color: 'bg-teal-500' },
                        { cat: 'Corretiva', pct: 35, color: 'bg-amber-500' },
                        { cat: 'Preditiva', pct: 12, color: 'bg-teal-500' },
                        { cat: 'Outros', pct: 5, color: 'bg-gray-400' },
                      ].map((c) => (
                        <div key={c.cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{c.cat}</span>
                            <span className="font-medium">{c.pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", c.color)} style={{ width: `${c.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Economia este mês: R$ 28.500</span>
                  </div>
                  <div className="flex gap-4 text-xs text-emerald-600">
                    <span>5 falhas evitadas</span>
                    <span>•</span>
                    <span>120h downtime prevenido</span>
                    <span>•</span>
                    <span>ROI: 3.2x</span>
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* Interactive Modules Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Explore os modulos do TrakLedger
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Uma trilha automatica mostra como o budget se conecta ao ledger, compromissos e economia.
            </p>
          </div>

          <div
            className="relative rounded-3xl border border-teal-100 bg-white/80 p-6 lg:p-8 shadow-xl"
            onPointerEnter={() => setIsPaused(true)}
            onPointerLeave={() => setIsPaused(false)}
          >
            <div className="absolute -top-16 right-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="absolute -bottom-10 left-12 h-40 w-40 rounded-full bg-teal-100/70 blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {moduleScreens.map((module, index) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        index === activeIndex
                          ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                          : 'border-teal-100 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700'
                      )}
                    >
                      <module.icon className={cn("h-4 w-4", index === activeIndex ? 'text-white' : 'text-teal-500')} />
                      {module.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", isPaused ? 'bg-gray-300' : 'bg-teal-500 animate-pulse')} />
                    {isPaused ? 'Pausado' : 'Transicao automatica'}
                  </span>
                  <span className="hidden sm:inline">Proximo: {nextModule.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrev}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-lg">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_55%)]" />
                <div
                  className="relative flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                  {moduleScreens.map((module) => (
                    <div key={module.id} className="min-w-full p-6 lg:p-8">
                      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
                              <module.icon className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold">{module.name}</h3>
                              <p className="text-sm text-gray-500">Modulo TrakLedger</p>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-6">{module.description}</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {module.features.map((feature) => (
                              <div key={feature} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-teal-500" />
                                <span className="text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-2xl p-4">
                          <ModulePreview moduleId={module.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  {activeModule.name} em foco
                </span>
                <div className="flex items-center gap-2">
                  {moduleScreens.map((module, index) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="group"
                      aria-label={`Ir para ${module.name}`}
                    >
                      <span
                        className={cn(
                          "block h-1.5 rounded-full transition-all",
                          index === activeIndex ? 'w-8 bg-teal-500' : 'w-3 bg-teal-200 group-hover:bg-teal-300'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Screen: Ledger */}
      <section className="py-16 md:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-900 text-teal-300">Interface moderna</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ledger de Lançamentos</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Todos os custos de manutenção em um só lugar, com rastreabilidade completa.
            </p>
          </div>

          <ScreenMockup title="TrakLedger — Lançamentos" className="max-w-5xl mx-auto">
            <div className="flex min-h-[500px]">
              <div className="w-56 bg-gray-50 border-r p-3 space-y-1">
                {[
                  { icon: BarChart3, name: 'Painel', active: false },
                  { icon: FileText, name: 'Lançamentos', active: true },
                  { icon: PiggyBank, name: 'Economia', active: false },
                  { icon: Target, name: 'Orçamentos', active: false },
                  { icon: Wallet, name: 'Compromissos', active: false },
                ].map((item) => (
                  <div key={item.name} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm", item.active ? 'bg-teal-500 text-white' : 'text-gray-600')}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Lançamentos</h2>
                    <p className="text-sm text-gray-500">247 transações • R$ 485.320,00 total</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filtros</Button>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {['Todos', 'Preventiva', 'Corretiva', 'Preditiva', 'Peças', 'Mão de Obra'].map((f, i) => (
                    <span key={f} className={cn("text-xs px-2 py-1 rounded cursor-pointer", i === 0 ? 'bg-teal-100 text-teal-700' : 'hover:bg-gray-100')}>{f}</span>
                  ))}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-xs text-gray-500">
                        <th className="text-left px-4 py-3 font-medium">Data</th>
                        <th className="text-left px-4 py-3 font-medium">Descrição</th>
                        <th className="text-left px-4 py-3 font-medium">Categoria</th>
                        <th className="text-left px-4 py-3 font-medium">OS</th>
                        <th className="text-right px-4 py-3 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { date: '15/12', desc: 'Manutenção Preventiva Chiller 01', cat: 'Preventiva', os: 'OS-0847', value: 'R$ 1.730,00' },
                        { date: '14/12', desc: 'Reparo emergencial Split Sala 12', cat: 'Corretiva', os: 'OS-0846', value: 'R$ 890,00' },
                        { date: '13/12', desc: 'Troca de filtros - Bloco A', cat: 'Preventiva', os: 'OS-0845', value: 'R$ 320,00' },
                        { date: '12/12', desc: 'Análise preditiva vibração', cat: 'Preditiva', os: 'OS-0844', value: 'R$ 450,00' },
                        { date: '11/12', desc: 'Peças - Compressor Fan Coil', cat: 'Peças', os: 'OS-0843', value: 'R$ 2.850,00' },
                        { date: '10/12', desc: 'Mão de obra - Técnico externo', cat: 'Mão de Obra', os: 'OS-0842', value: 'R$ 1.200,00' },
                      ].map((t, i) => (
                        <tr key={i} className="text-sm hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{t.date}</td>
                          <td className="px-4 py-3 text-gray-900">{t.desc}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs px-2 py-0.5 rounded", 
                              t.cat === 'Preventiva' ? 'bg-teal-100 text-teal-700' :
                              t.cat === 'Corretiva' ? 'bg-amber-100 text-amber-700' :
                              t.cat === 'Preditiva' ? 'bg-teal-100 text-teal-700' :
                              'bg-gray-100 text-gray-700'
                            )}>{t.cat}</span>
                          </td>
                          <td className="px-4 py-3 text-teal-600 font-medium">{t.os}</td>
                          <td className="px-4 py-3 text-right font-medium">{t.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>Mostrando 1-6 de 247</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">1</Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">2</Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">3</Button>
                    <span className="px-2">...</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">42</Button>
                  </div>
                </div>
              </div>
            </div>
          </ScreenMockup>
        </div>
      </section>

      {/* Savings Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-100 text-emerald-700">Economia Documentada</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Comprove o ROI da Manutenção</h2>
              <p className="text-lg text-gray-500 mb-6">
                Registre e documente as economias geradas pela manutenção preditiva. 
                Falhas evitadas, downtime prevenido e custos economizados com dados reais.
              </p>
              <div className="space-y-4">
                {[
                  'Registro de falhas evitadas com cálculo de custo estimado',
                  'Downtime prevenido convertido em valor TrakLedgeriro',
                  'ROI automático baseado em investimento vs economia',
                  'Relatórios gerenciais para apresentação à diretoria',
                  'Histórico de economias por período e categoria',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <ScreenMockup title="TrakLedger — Registro de Economia">
              <div className="p-6 bg-white">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Nova Economia Registrada</h3>
                  <p className="text-sm text-gray-500">Documente a economia gerada</p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-emerald-600 mb-1">Tipo de Economia</div>
                        <div className="font-medium text-emerald-900">Falha Evitada</div>
                      </div>
                      <div>
                        <div className="text-xs text-emerald-600 mb-1">Ativo</div>
                        <div className="font-medium text-emerald-900">Chiller 01</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-white/50 rounded">
                        <span className="text-emerald-700">Custo estimado da falha</span>
                        <span className="font-bold text-emerald-900">R$ 15.000,00</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white/50 rounded">
                        <span className="text-emerald-700">Custo da prevenção</span>
                        <span className="font-medium text-emerald-800">R$ 2.500,00</span>
                      </div>
                      <div className="flex justify-between p-2 bg-emerald-100 rounded">
                        <span className="font-medium text-emerald-800">Economia líquida</span>
                        <span className="font-bold text-emerald-900">R$ 12.500,00</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Detalhes</div>
                    <div className="text-sm text-gray-600 p-2 bg-white rounded border">
                      Análise de vibração identificou desgaste no rolamento antes da falha catastrófica. 
                      Troca programada evitou parada não planejada de 48h em período crítico.
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">48h</div>
                      <div className="text-xs text-blue-500">Downtime evitado</div>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-lg">
                      <div className="text-2xl font-bold text-teal-600">5.0x</div>
                      <div className="text-xs text-teal-500">ROI desta ação</div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Sparkles className="w-4 h-4 mr-2" /> Registrar Economia
                  </Button>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Integração Nativa</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Conectado ao TrakNor CMMS</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Quando uma ordem de serviço é finalizada, os custos são automaticamente lançados 
              no ledger com rastreabilidade completa.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="flex items-center gap-6 p-6 bg-white rounded-xl border shadow-sm mb-4">
                <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">OS #2024-0847 Finalizada</div>
                  <div className="text-gray-500">Manutenção Preventiva • Chiller 01</div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-gray-600">Mão de obra: <strong>R$ 450</strong></span>
                    <span className="text-gray-600">Peças: <strong>R$ 1.280</strong></span>
                  </div>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>

              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-teal-300" />
                  <Activity className="w-6 h-6 text-teal-500 my-2" />
                  <div className="w-0.5 h-8 bg-teal-300" />
                </div>
              </div>

              <div className="flex items-center gap-6 p-6 bg-teal-50 rounded-xl border border-teal-200">
                <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg text-teal-900">Lançamento Automático</div>
                  <div className="text-teal-600">Ledger atualizado • Categoria: Preventiva</div>
                  <div className="flex gap-4 mt-2 text-sm text-teal-700">
                    <span>Centro de custo: Bloco A</span>
                    <span>•</span>
                    <span>Ref: OS-0847</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-700">R$ 1.730</div>
                  <div className="text-xs text-teal-500">Total lançado</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Você consegue provar o valor da manutenção hoje?</h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Com o TrakLedger, cada economia é documentada, cada investimento é rastreado e cada relatório 
            mostra o ROI real da sua operação. Pare de justificar custos, comece a mostrar valor.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Ver demonstração gratuita <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/precos">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Ver Planos e Preços</Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-teal-200">
            ✓ ROI comprovado em 90 dias  ✓ Relatórios para diretoria  ✓ Setup em 7 dias
          </p>
        </div>
      </section>
    </div>
  )
}

// Module Preview Component
function ModulePreview({ moduleId }: { moduleId: string }) {
  const previews: Record<string, React.ReactNode> = {
    painel: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 bg-teal-50 rounded text-center">
            <div className="text-lg font-bold text-teal-600">57%</div>
            <div className="text-xs text-gray-500">Orcamento usado</div>
          </div>
          <div className="p-2 bg-emerald-50 rounded text-center">
            <div className="text-lg font-bold text-emerald-600">R$ 124k</div>
            <div className="text-xs text-gray-500">Economia</div>
          </div>
        </div>
        <div className="h-16 flex items-end gap-1">
          {[45, 52, 48, 55, 50, 58, 45, 62, 55, 68, 72, 65].map((h, i) => (
            <div key={i} className="flex-1 bg-teal-400 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
    orcamentos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Envelopes do ano</div>
        <div className="space-y-2">
          {[
            { name: 'Manutencao HVAC', pct: 62, value: 'R$ 180k' },
            { name: 'Pecas e insumos', pct: 48, value: 'R$ 95k' },
            { name: 'Terceiros', pct: 35, value: 'R$ 70k' },
          ].map((item) => (
            <div key={item.name} className="rounded-lg border border-gray-100 p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-teal-600">{item.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    lancamentos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="space-y-2">
          {[
            { desc: 'Manutencao Chiller 01', cat: 'Preventiva', value: 'R$ 1.730' },
            { desc: 'Reparo Split Sala 12', cat: 'Corretiva', value: 'R$ 890' },
            { desc: 'Troca filtros Bloco A', cat: 'Preventiva', value: 'R$ 320' },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <FileText className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium">{t.desc}</div>
                <span className={cn("text-xs", t.cat === 'Preventiva' ? 'text-teal-600' : 'text-amber-600')}>{t.cat}</span>
              </div>
              <span className="font-medium">{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    compromissos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Compromissos em fluxo</div>
        <div className="space-y-2 text-xs">
          {[
            { desc: 'Contrato filtros', status: 'Em aprovacao', value: 'R$ 18.200' },
            { desc: 'Manutencao corretiva', status: 'Submetido', value: 'R$ 6.450' },
            { desc: 'Servico eletrico', status: 'Aprovado', value: 'R$ 9.700' },
          ].map((item) => (
            <div key={item.desc} className="flex items-center gap-2 rounded bg-gray-50 p-2">
              <Wallet className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium">{item.desc}</div>
                <div className="text-gray-500">{item.status}</div>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    economia: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Economias recentes</div>
        <div className="space-y-2">
          {[
            { desc: 'Falha evitada - Chiller 01', value: 'R$ 12.500' },
            { desc: 'Downtime prevenido - CPD', value: 'R$ 8.200' },
            { desc: 'Otimizacao energia', value: 'R$ 3.800' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50 rounded text-xs">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              <span className="flex-1">{e.desc}</span>
              <span className="font-bold text-emerald-600">{e.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-teal-50 rounded text-center">
          <div className="text-xs text-teal-600">ROI acumulado</div>
          <div className="text-lg font-bold text-teal-700">3.2x</div>
        </div>
      </div>
    ),
    configuracoes: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Parametros principais</div>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Centros de custo', value: '12 ativos' },
            { label: 'Categorias', value: '8 padroes' },
            { label: 'Regras de alocacao', value: 'Ativas' },
            { label: 'Rate cards', value: '3 contratos' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded bg-gray-50 p-2">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium text-teal-600">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded bg-teal-50 px-2 py-1 text-xs text-teal-700">
          <Wrench className="h-3 w-3" />
          Regras simples habilitadas
        </div>
      </div>
    ),
  }
  return previews[moduleId] || <div className="text-center py-8 text-gray-500">Preview nao disponivel</div>
}
