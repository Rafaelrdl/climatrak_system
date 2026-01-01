import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
    description: 'Dashboard financeiro completo com visão de orçamento, realizado, comprometido e economias. Gráficos por período, categoria e localidade.',
    features: ['Orçamento vs Realizado', 'Gastos por categoria', 'Tendências mensais', 'Top 10 ativos por custo', 'Alertas de orçamento'],
  },
  {
    id: 'lancamentos',
    name: 'Lançamentos',
    icon: FileText,
    description: 'Ledger completo com todos os lançamentos financeiros de manutenção. Filtros avançados, exportação e rastreabilidade por OS.',
    features: ['Histórico completo', 'Filtros por período/categoria', 'Exportação Excel/PDF', 'Vínculo com OS', 'Compromissos futuros'],
  },
  {
    id: 'economia',
    name: 'Economia',
    icon: PiggyBank,
    description: 'Documente e comprove economias geradas pela manutenção preditiva. Falhas evitadas, downtime prevenido e ROI calculado.',
    features: ['Registro de economias', 'Cálculo de ROI', 'Falhas evitadas', 'Downtime prevenido', 'Relatórios gerenciais'],
  },
]

const kpis = [
  { label: 'Orçamento', value: 'R$ 850k', icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-100' },
  { label: 'Comprometido', value: 'R$ 620k', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Realizado', value: 'R$ 485k', icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-100' },
  { label: 'Economia', value: 'R$ 124k', icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-100' },
]

export function FinancePage() {
  const [activeModule, setActiveModule] = useState('painel')
  const activeScreen = moduleScreens.find(m => m.id === activeModule)!

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
                <Badge className="bg-teal-100 text-teal-700">Módulo Finance</Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">Finance</h1>
              <p className="text-xl text-gray-600 mb-4">
                Gestão Financeira de Manutenção
              </p>
              <p className="text-lg text-gray-500 mb-8">
                Controle total dos custos de manutenção com orçamentos, lançamentos automáticos, 
                compromissos e registro de economias. Integrado nativamente ao TrakNor CMMS.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                    Agendar Demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="lg" variant="outline">Ver Planos</Button>
                </Link>
              </div>
            </div>
            
            {/* Hero Screen Mockup */}
            <ScreenMockup title="Finance — Painel Financeiro">
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
              Explore os Módulos do Finance
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Clique em cada módulo para ver detalhes e preview da interface.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              {moduleScreens.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                    activeModule === module.id 
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-white border hover:border-teal-300 hover:bg-teal-50'
                  )}
                >
                  <module.icon className={cn("w-5 h-5", activeModule === module.id ? 'text-white' : 'text-teal-600')} />
                  <span className="font-medium">{module.name}</span>
                  <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", activeModule === module.id ? 'text-white rotate-90' : 'text-gray-400')} />
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-teal-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                      <activeScreen.icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{activeScreen.name}</h3>
                      <p className="text-sm text-gray-500">Módulo Finance</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{activeScreen.description}</p>
                  
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {activeScreen.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-100 rounded-xl p-4">
                    <ModulePreview moduleId={activeModule} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Full Screen: Ledger */}
      <section className="py-16 md:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-900 text-teal-300">Interface Moderna</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ledger de Lançamentos</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Todos os custos de manutenção em um só lugar, com rastreabilidade completa.
            </p>
          </div>

          <ScreenMockup title="Finance — Lançamentos" className="max-w-5xl mx-auto">
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
                  'Downtime prevenido convertido em valor financeiro',
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
            
            <ScreenMockup title="Finance — Registro de Economia">
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
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Transforme a Gestão Financeira da Manutenção</h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Junte-se às empresas que já controlam seus custos de manutenção de forma profissional.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Agendar Demonstração <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/precos">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Ver Planos e Preços</Button>
            </Link>
          </div>
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
            <div className="text-xs text-gray-500">Orçamento usado</div>
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
    lancamentos: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="space-y-2">
          {[
            { desc: 'Manutenção Chiller 01', cat: 'Preventiva', value: 'R$ 1.730' },
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
    economia: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm font-medium mb-3">Economias Recentes</div>
        <div className="space-y-2">
          {[
            { desc: 'Falha evitada - Chiller 01', value: 'R$ 12.500' },
            { desc: 'Downtime prevenido - CPD', value: 'R$ 8.200' },
            { desc: 'Otimização energia', value: 'R$ 3.800' },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50 rounded text-xs">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              <span className="flex-1">{e.desc}</span>
              <span className="font-bold text-emerald-600">{e.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-teal-50 rounded text-center">
          <div className="text-xs text-teal-600">ROI Acumulado</div>
          <div className="text-lg font-bold text-teal-700">3.2x</div>
        </div>
      </div>
    ),
  }
  return previews[moduleId] || <div className="text-center py-8 text-gray-500">Preview não disponível</div>
}

