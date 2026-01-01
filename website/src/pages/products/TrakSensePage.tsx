import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Activity, 
  Bell, 
  LineChart, 
  Gauge, 
  Wifi,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  Settings,
  Eye,
  ChevronRight,
  LayoutDashboard,
  Zap,
  Plus,
  MoreVertical,
  Radio,
  SignalHigh,
  BatteryMedium,
  Clock,
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

// Module screens data for Monitor
const moduleScreens = [
  {
    id: 'visao-geral',
    name: 'Visão Geral',
    icon: LayoutDashboard,
    description: 'Dashboard principal com visão consolidada de todos os sensores, alertas ativos e métricas em tempo real.',
    features: ['Status de todos os sensores', 'Alertas ativos', 'Métricas consolidadas', 'Mapa de localizações', 'Últimas leituras'],
  },
  {
    id: 'dashboards',
    name: 'Dashboards',
    icon: Gauge,
    description: 'Crie dashboards personalizados com widgets de gráficos, gauges e indicadores para suas necessidades específicas.',
    features: ['Drag & drop de widgets', 'Gráficos em tempo real', 'Gauges configuráveis', 'Múltiplos dashboards', 'Compartilhamento'],
  },
  {
    id: 'sensores',
    name: 'Sensores',
    icon: Radio,
    description: 'Gerencie todos os sensores instalados com detalhes de status, bateria, sinal e última comunicação.',
    features: ['Lista de sensores', 'Status em tempo real', 'Nível de bateria', 'Qualidade do sinal', 'Configurações'],
  },
  {
    id: 'alertas',
    name: 'Alertas',
    icon: Bell,
    description: 'Central de alertas com histórico, notificações configuráveis e integração com TrakNor para criar OS.',
    features: ['Alertas em tempo real', 'Histórico completo', 'Notificações multi-canal', 'Integração TrakNor', 'Escalonamento'],
  },
  {
    id: 'regras',
    name: 'Regras',
    icon: Settings,
    description: 'Configure regras de alerta com condições compostas, janelas de tempo e ações automáticas.',
    features: ['Condições lógicas', 'Múltiplos gatilhos', 'Janelas de tempo', 'Ações automáticas', 'Templates de regras'],
  },
]

const metrics = [
  { icon: Clock, label: 'Latência média', value: '< 2s' },
  { icon: Radio, label: 'Sensores suportados', value: '100+' },
  { icon: Bell, label: 'Alertas em tempo real', value: '99.9%' },
  { icon: Wifi, label: 'Uptime garantido', value: '99.9%' },
]

export function TrakSensePage() {
  const [activeModule, setActiveModule] = useState('visao-geral')
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
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-teal-100 text-teal-700">IoT Platform</Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">TrakSense</h1>
              <p className="text-xl text-gray-600 mb-4">
                Plataforma de Monitoramento IoT em Tempo Real
              </p>
              <p className="text-lg text-gray-500 mb-8">
                Transforme dados de sensores em insights acionáveis. Dashboards interativos, 
                alertas inteligentes e análise de tendências para seus equipamentos HVAC.
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
            <ScreenMockup title="TrakSense — Dashboard de Monitoramento">
              <div className="p-4 bg-gray-50 min-h-[400px]">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Thermometer className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-gray-500">Temperatura</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">23.5°C</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Normal
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-500">Umidade</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">58%</div>
                    <div className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Elevada
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Wind className="w-4 h-4 text-teal-500" />
                      <span className="text-xs text-gray-500">CO₂</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">420ppm</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Normal
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-500">Alertas</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">3</div>
                    <div className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> 1 crítico
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Temperatura - Últimas 24h</span>
                      <span className="text-xs text-gray-400">Atualizado há 30s</span>
                    </div>
                    <div className="relative h-32">
                      <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path d="M0,60 C30,55 60,70 90,50 C120,30 150,45 180,40 C210,35 240,55 270,45 C285,42 300,50 300,50 L300,100 L0,100 Z" fill="url(#tempGrad)" />
                        <path d="M0,60 C30,55 60,70 90,50 C120,30 150,45 180,40 C210,35 240,55 270,45 C285,42 300,50 300,50" fill="none" stroke="rgb(6, 182, 212)" strokeWidth="2" />
                        <line x1="0" y1="70" x2="300" y2="70" stroke="rgb(220,38,38)" strokeWidth="1" strokeDasharray="4" />
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 pt-1">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>Agora</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">Sensores Online</div>
                    <div className="flex items-center justify-center mb-3">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="35" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                          <circle cx="40" cy="40" r="35" fill="none" stroke="#06b6d4" strokeWidth="8" strokeDasharray="198" strokeDashoffset="20" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">92%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-gray-500">23 de 25 online</div>
                  </div>
                </div>
                
                <div className="mt-4 bg-white rounded-lg border shadow-sm">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Alertas Recentes</span>
                    <Button variant="ghost" size="sm" className="text-xs h-7">Ver todos</Button>
                  </div>
                  <div className="divide-y">
                    {[
                      { type: 'critical', sensor: 'Chiller 01', msg: 'Temperatura acima do limite', time: '5 min' },
                      { type: 'warning', sensor: 'Sala Server', msg: 'Umidade elevada', time: '23 min' },
                    ].map((alert, i) => (
                      <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                        <AlertTriangle className={cn("w-4 h-4", alert.type === 'critical' ? 'text-red-500' : 'text-amber-500')} />
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">{alert.sensor}</span>
                          <span className="text-gray-500"> — {alert.msg}</span>
                        </div>
                        <span className="text-gray-400">{alert.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-8 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="text-xl font-bold">{metric.value}</div>
                  <div className="text-xs text-gray-500">{metric.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Modules Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Explore os Módulos do TrakSense
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
                      <p className="text-sm text-gray-500">Módulo do TrakSense IoT</p>
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

      {/* Full Screen: Dashboard Builder */}
      <section className="py-16 md:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-900 text-teal-300">Interface Moderna</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Dashboards Personalizáveis</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Arraste e solte widgets para criar o painel perfeito para suas necessidades.
            </p>
          </div>

          <ScreenMockup title="TrakSense — Editor de Dashboard" className="max-w-5xl mx-auto">
            <div className="flex min-h-[500px]">
              <div className="w-56 bg-gray-50 border-r p-3 space-y-1">
                {[
                  { icon: LayoutDashboard, name: 'Visão Geral', active: false },
                  { icon: Gauge, name: 'Dashboards', active: true },
                  { icon: Radio, name: 'Sensores', active: false },
                  { icon: Bell, name: 'Alertas', active: false },
                  { icon: Settings, name: 'Regras', active: false },
                  { icon: LineChart, name: 'Relatórios', active: false },
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
                    <h2 className="text-xl font-bold text-gray-900">Sala de Servidores</h2>
                    <p className="text-sm text-gray-500">Dashboard customizado • Atualizado em tempo real</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Widget</Button>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">Salvar</Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {/* Large Chart Widget */}
                  <div className="col-span-3 bg-white rounded-lg border shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Temperatura vs Umidade</span>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="h-40 flex items-end gap-1">
                      {Array.from({length: 24}).map((_, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-0.5">
                          <div className="bg-teal-400 rounded-t" style={{ height: `${30 + Math.random() * 40}%` }} />
                          <div className="bg-blue-400 rounded-t" style={{ height: `${20 + Math.random() * 30}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-400 rounded" /> Temperatura</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded" /> Umidade</span>
                    </div>
                  </div>

                  {/* Gauge Widget */}
                  <div className="bg-white rounded-lg border shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CPU Temp</span>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#06b6d4" strokeWidth="10" strokeDasharray="251" strokeDashoffset="75" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold">68°C</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-green-600 mt-2">Normal</div>
                  </div>

                  {/* Sensor Status Grid */}
                  <div className="col-span-2 bg-white rounded-lg border shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Status dos Sensores</span>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: 'Rack A1', temp: '24°C', status: 'ok' },
                        { name: 'Rack A2', temp: '26°C', status: 'ok' },
                        { name: 'Rack B1', temp: '32°C', status: 'warn' },
                        { name: 'Rack B2', temp: '23°C', status: 'ok' },
                        { name: 'AC Unit', temp: '18°C', status: 'ok' },
                        { name: 'UPS', temp: '35°C', status: 'critical' },
                      ].map((s) => (
                        <div key={s.name} className={cn("p-2 rounded text-xs text-center", s.status === 'ok' ? 'bg-green-50' : s.status === 'warn' ? 'bg-amber-50' : 'bg-red-50')}>
                          <div className="font-medium">{s.name}</div>
                          <div className={cn("font-bold", s.status === 'ok' ? 'text-green-600' : s.status === 'warn' ? 'text-amber-600' : 'text-red-600')}>{s.temp}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alert Widget */}
                  <div className="col-span-2 bg-white rounded-lg border shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Últimos Alertas</span>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { msg: 'UPS temperatura crítica', time: '2 min', type: 'critical' },
                        { msg: 'Rack B1 acima do normal', time: '15 min', type: 'warning' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <AlertTriangle className={cn("w-3 h-3", a.type === 'critical' ? 'text-red-500' : 'text-amber-500')} />
                          <span className="flex-1">{a.msg}</span>
                          <span className="text-gray-400">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScreenMockup>
        </div>
      </section>

      {/* Rules Engine Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-700">Motor de Regras</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Alertas Inteligentes</h2>
              <p className="text-lg text-gray-500 mb-6">
                Configure regras complexas com condições compostas, janelas de tempo e ações automáticas 
                para receber notificações precisas e evitar alarmes falsos.
              </p>
              <div className="space-y-4">
                {[
                  'Condições lógicas: AND, OR, NOT',
                  'Comparadores: maior, menor, igual, fora do range',
                  'Janela de tempo: média, máximo, mínimo em período',
                  'Ações: e-mail, SMS, WhatsApp, criar OS no TrakNor',
                  'Escalonamento automático por severidade',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <ScreenMockup title="TrakSense — Editor de Regras">
              <div className="p-6 bg-white">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Nova Regra de Alerta</h3>
                  <p className="text-sm text-gray-500">Configure as condições e ações</p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Condições</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                        <span className="text-gray-600">QUANDO</span>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">Temperatura</span>
                        <span className="text-gray-600">for</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">maior que</span>
                        <span className="font-medium">28°C</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">E</span>
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">Umidade</span>
                        <span className="text-gray-600">for</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">maior que</span>
                        <span className="font-medium">70%</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                        <span className="text-gray-600">POR</span>
                        <span className="font-medium">5 minutos</span>
                        <span className="text-gray-600">consecutivos</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Ações</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>Enviar alerta por e-mail</span>
                        <span className="text-gray-400 ml-auto">equipe@empresa.com</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                        <Zap className="w-4 h-4 text-teal-500" />
                        <span>Criar OS no TrakNor</span>
                        <span className="text-gray-400 ml-auto">Preventiva</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">Cancelar</Button>
                    <Button className="flex-1 bg-teal-600 hover:bg-teal-700">Salvar Regra</Button>
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Comece a monitorar agora</h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração e veja como o TrakSense pode dar visibilidade total aos seus equipamentos HVAC.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/demo">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Agendar Demo Gratuita <ArrowRight className="ml-2 h-4 w-4" />
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
    'visao-geral': (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: Radio, label: 'Online', value: '23', color: 'text-green-600' },
            { icon: Bell, label: 'Alertas', value: '3', color: 'text-amber-600' },
            { icon: Thermometer, label: 'Temp. Média', value: '24°C', color: 'text-teal-600' },
            { icon: Droplets, label: 'Umidade', value: '55%', color: 'text-blue-600' },
          ].map((m) => (
            <div key={m.label} className="text-center p-2 bg-gray-50 rounded">
              <m.icon className={cn("w-4 h-4 mx-auto mb-1", m.color)} />
              <div className="text-lg font-bold">{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="h-16 flex items-end gap-0.5">
          {Array.from({length: 30}).map((_, i) => (
            <div key={i} className="flex-1 bg-teal-400 rounded-t" style={{ height: `${30 + Math.random() * 50}%` }} />
          ))}
        </div>
      </div>
    ),
    dashboards: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium">Meus Dashboards</span>
          <Button variant="outline" size="sm" className="ml-auto h-6 text-xs"><Plus className="w-3 h-3 mr-1" /> Novo</Button>
        </div>
        <div className="space-y-2">
          {['Sala de Servidores', 'Produção', 'Laboratório'].map((d) => (
            <div key={d} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <LayoutDashboard className="w-4 h-4 text-teal-500" />
              <span className="flex-1 font-medium">{d}</span>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    ),
    sensores: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="space-y-2">
          {[
            { name: 'AirTrak-001', location: 'Rack A1', signal: 'Forte', battery: 85 },
            { name: 'AirTrak-002', location: 'Sala Server', signal: 'Médio', battery: 62 },
            { name: 'AirTrak-003', location: 'AC Unit', signal: 'Forte', battery: 91 },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-xs">
              <Radio className="w-4 h-4 text-teal-500" />
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-gray-500">{s.location}</div>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <SignalHigh className="w-3 h-3" />
                <BatteryMedium className="w-3 h-3" />
                <span>{s.battery}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    alertas: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex gap-2 mb-3">
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Críticos (1)</span>
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">Atenção (2)</span>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">Resolvidos</span>
        </div>
        <div className="space-y-2">
          {[
            { type: 'critical', msg: 'Temperatura UPS crítica', time: '2 min' },
            { type: 'warning', msg: 'Umidade elevada - Lab', time: '15 min' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <AlertTriangle className={cn("w-4 h-4", a.type === 'critical' ? 'text-red-500' : 'text-amber-500')} />
              <span className="flex-1">{a.msg}</span>
              <span className="text-gray-400">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    regras: (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Regras Ativas</span>
          <Button variant="outline" size="sm" className="h-6 text-xs"><Plus className="w-3 h-3 mr-1" /> Nova</Button>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Temp. Crítica Server', status: 'Ativa' },
            { name: 'Umidade Alta Lab', status: 'Ativa' },
            { name: 'CO₂ Elevado', status: 'Pausada' },
          ].map((r) => (
            <div key={r.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <Settings className="w-4 h-4 text-teal-500" />
              <span className="flex-1 font-medium">{r.name}</span>
              <span className={cn("px-1.5 py-0.5 rounded", r.status === 'Ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600')}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  }
  return previews[moduleId] || <div className="text-center py-8 text-gray-500">Preview não disponível</div>
}


