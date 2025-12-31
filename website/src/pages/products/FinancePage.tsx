import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  FileText,
  Target,
  Calculator,
  BarChart3,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react'

const features = [
  {
    icon: Target,
    title: 'Orçamentos por Centro de Custo',
    description: 'Defina orçamentos anuais ou mensais por localidade, categoria (preventiva, corretiva, preditiva) e acompanhe em tempo real.',
  },
  {
    icon: FileText,
    title: 'Lançamentos Automáticos',
    description: 'Custos de ordens de serviço são lançados automaticamente no ledger quando a OS é finalizada.',
  },
  {
    icon: CheckSquare,
    title: 'Compromissos de Manutenção',
    description: 'Registre compromissos futuros (contratos, peças em pedido) para melhor previsibilidade financeira.',
  },
  {
    icon: PiggyBank,
    title: 'Registro de Economias',
    description: 'Documente economias geradas por manutenção preditiva, evitando falhas e paradas não programadas.',
  },
  {
    icon: BarChart3,
    title: 'Dashboards Financeiros',
    description: 'Visualize gastos por período, categoria, ativo e localidade com gráficos interativos e exportáveis.',
  },
  {
    icon: AlertTriangle,
    title: 'Alertas de Orçamento',
    description: 'Receba notificações quando os gastos se aproximam ou ultrapassam o orçamento definido.',
  },
]

const kpis = [
  { 
    label: 'Orçamento Planejado', 
    value: 'R$ 850.000', 
    trend: null,
    icon: Wallet,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  { 
    label: 'Comprometido', 
    value: 'R$ 620.000', 
    trend: '73%',
    icon: CheckSquare,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  { 
    label: 'Realizado', 
    value: 'R$ 485.000', 
    trend: '57%',
    icon: DollarSign,
    color: 'text-teal-600',
    bg: 'bg-teal-100',
  },
  { 
    label: 'Economia Gerada', 
    value: 'R$ 124.000', 
    trend: '+15%',
    icon: PiggyBank,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
]

const benefits = [
  {
    title: 'Visibilidade Total dos Custos',
    description: 'Saiba exatamente quanto gasta com manutenção por ativo, categoria e período.',
    stat: '100%',
    statLabel: 'Rastreabilidade',
  },
  {
    title: 'Previsibilidade Financeira',
    description: 'Compromissos e orçamentos integrados permitem planejamento eficiente.',
    stat: '85%',
    statLabel: 'Precisão no Forecast',
  },
  {
    title: 'ROI Documentado',
    description: 'Comprove o retorno do investimento em manutenção preditiva com dados reais.',
    stat: '3.2x',
    statLabel: 'ROI Médio',
  },
]

export function FinancePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-violet-50 via-white to-violet-100">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-violet-100 text-violet-700 hover:bg-violet-200">
                Módulo Finance
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
                Gestão Financeira de{' '}
                <span className="text-violet-600">Manutenção</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Controle total dos custos de manutenção com orçamentos, lançamentos automáticos, 
                compromissos e registro de economias. Integrado nativamente ao TrakNor CMMS.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-violet-600 hover:bg-violet-700">
                    Solicitar Demonstração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="lg" variant="outline">
                    Ver Planos
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <Card className="overflow-hidden shadow-2xl border-violet-200">
                <CardHeader className="bg-violet-600 text-white">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <CardTitle className="text-lg">Painel Financeiro - Dezembro 2025</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {kpis.map((kpi) => (
                      <div key={kpi.label} className="p-4 rounded-lg bg-gray-50 border">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded ${kpi.bg}`}>
                            <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                          </div>
                          <span className="text-xs text-muted-foreground">{kpi.label}</span>
                        </div>
                        <div className="font-bold text-lg">{kpi.value}</div>
                        {kpi.trend && (
                          <div className="text-xs text-muted-foreground mt-1">{kpi.trend} do orçamento</div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">Economia este mês: R$ 28.500</span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                      5 falhas evitadas por manutenção preditiva
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white p-3 rounded-xl shadow-lg border">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">Custo Preventiva</span>
                  <span className="text-emerald-600 text-sm">-12%</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-lg border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">Budget Tracking</span>
                  <span className="text-violet-600 text-sm">On Track</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Controle Financeiro Completo
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Todas as ferramentas que você precisa para gerenciar os custos de manutenção 
              de forma profissional e integrada.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover border-violet-100 hover:border-violet-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-violet-900 text-white">
        <div className="container-wide">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-violet-800 text-violet-100">Resultados</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Benefícios Comprovados
            </h2>
            <p className="text-lg text-violet-200 max-w-2xl mx-auto">
              Empresas que utilizam o Finance reportam ganhos significativos 
              em controle e redução de custos de manutenção.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="text-5xl font-bold text-violet-300 mb-2">{benefit.stat}</div>
                <div className="text-sm text-violet-400 mb-4">{benefit.statLabel}</div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-violet-200">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Integração Nativa</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Conectado ao TrakNor CMMS
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                O módulo Finance está totalmente integrado ao TrakNor. Quando uma ordem de serviço 
                é finalizada, os custos são automaticamente lançados no ledger com rastreabilidade completa.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Lançamento Automático</h4>
                    <p className="text-sm text-muted-foreground">
                      Custos de mão de obra e peças registrados automaticamente
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Rastreabilidade por OS</h4>
                    <p className="text-sm text-muted-foreground">
                      Cada transação referencia a ordem de serviço original
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Drill-down Completo</h4>
                    <p className="text-sm text-muted-foreground">
                      Do dashboard financeiro até o detalhe da ordem de serviço
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="p-6 bg-gray-50">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">OS #2024-1234 Finalizada</div>
                      <div className="text-sm text-muted-foreground">Manutenção Preventiva - Chiller 01</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-violet-300" />
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-violet-900">Lançamento Automático</div>
                      <div className="text-sm text-violet-600">
                        <div>Mão de Obra: R$ 450,00</div>
                        <div>Peças: R$ 1.280,00</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-violet-700">R$ 1.730,00</div>
                      <div className="text-xs text-violet-500">Cat: Preventiva</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-violet-600 to-violet-500">
        <div className="container-wide text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Transforme a Gestão Financeira da Manutenção
          </h2>
          <p className="text-lg text-violet-100 mb-8 max-w-2xl mx-auto">
            Junte-se às empresas que já controlam seus custos de manutenção de forma profissional.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50">
                Solicitar Demonstração
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Falar com Vendas
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
