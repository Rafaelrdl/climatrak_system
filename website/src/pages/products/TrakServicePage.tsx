import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  ArrowRight, 
  Check, 
  Truck, 
  Calendar, 
  MapPin, 
  Route, 
  Gauge,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Target,
  DollarSign,
  Smartphone,
  Zap,
  Car,
  CheckCircle2,
  Play,
  Building2,
  Wrench,
  Activity,
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

// Mobile mockup component
function MobileMockup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[280px] rounded-[2.5rem] overflow-hidden border-8 border-gray-800 bg-white shadow-2xl", className)}>
      <div className="flex items-center justify-center py-2 bg-gray-800">
        <div className="w-20 h-5 rounded-full bg-gray-900" />
      </div>
      <div className="bg-white">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-orange-500">
          <span className="text-white font-medium text-sm">{title}</span>
          <Users className="w-4 h-4 text-white" />
        </div>
        {children}
      </div>
    </div>
  )
}

// Module screens data
const moduleScreens = [
  {
    id: 'dispatch',
    name: 'Agenda & Dispatch',
    icon: Calendar,
    description: 'Agende e distribua trabalhos para sua equipe com visualização em tempo real.',
    features: ['Calendário interativo', 'Atribuição de técnicos', 'Status em tempo real', 'Priorização inteligente', 'Notificações automáticas'],
  },
  {
    id: 'tracking',
    name: 'Rastreamento GPS',
    icon: MapPin,
    description: 'Acompanhe a localização da equipe em tempo real com privacidade e controle.',
    features: ['Mapa em tempo real', 'Status do técnico', 'Histórico de localização', 'Janela de trabalho (privacidade)', 'Precisão de sinal'],
  },
  {
    id: 'routes',
    name: 'Roteirização',
    icon: Route,
    description: 'Otimize rotas automaticamente para reduzir custos de deslocamento.',
    features: ['Otimização TSP', 'Múltiplas paradas', 'Tempo estimado', 'Distância total', 'Reordenação drag & drop'],
  },
  {
    id: 'mileage',
    name: 'Quilometragem',
    icon: Gauge,
    description: 'Controle de KM com comparativo GPS vs declarado e análise de variância.',
    features: ['KM por técnico/veículo', 'GPS vs Declarado', 'Análise de variância', 'Custo por km', 'Relatórios detalhados'],
  },
  {
    id: 'quotes',
    name: 'Orçamentos em Campo',
    icon: FileText,
    description: 'Crie orçamentos profissionais diretamente no campo, do celular ou tablet.',
    features: ['Criação mobile', 'Catálogo de serviços', 'Itens customizados', 'Aprovação digital', 'Integração Finance'],
  },
  {
    id: 'team',
    name: 'Gestão de Equipe',
    icon: Users,
    description: 'Gerencie técnicos, habilidades, disponibilidade e desempenho.',
    features: ['Perfis de técnicos', 'Habilidades e skills', 'Horário de trabalho', 'Métricas de performance', 'Gestão de capacidade'],
  },
]

const benefits = [
  'Reduza em 30% os custos com deslocamento',
  'Aumente em 25% o número de atendimentos/dia',
  'Orçamentos enviados e aprovados no mesmo dia',
  'Rastreamento com privacidade (janela de trabalho)',
  'Controle total de KM: GPS vs declarado',
  'Integrado nativamente ao TrakNor e TrakLedger',
]

export function TrakServicePage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const activeModule = moduleScreens[activeIndex]

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
      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-orange-100 text-orange-700">Field Service</Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                TrakService: <span className="text-orange-600">Sua equipe externa sob controle total.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Menos KM rodado. Mais atendimentos por dia. Orçamentos aprovados no campo.
              </p>
              <p className="text-lg text-gray-500 mb-6">
                Despacho inteligente, rastreamento com privacidade, roteirização otimizada e orçamentos 
                enviados do celular. <strong>Produtividade que você consegue medir.</strong>
              </p>
              
              {/* Quick stats */}
              <div className="flex gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">-30%</div>
                  <div className="text-xs text-gray-500">KM rodado</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">+25%</div>
                  <div className="text-xs text-gray-500">Atendimentos/dia</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">2x</div>
                  <div className="text-xs text-gray-500">Mais rápido orçamentos</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/demo">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                    Ver demonstração <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/precos">
                  <Button size="lg" variant="outline">Ver Planos</Button>
                </Link>
              </div>
              
              <p className="mt-4 text-sm text-gray-500">
                ✓ App mobile incluído  ✓ Integra com TrakNor  ✓ Privacidade do técnico garantida
              </p>
            </div>
            
            {/* Hero Screen Mockup */}
            <ScreenMockup title="TrakService — Dashboard">
              <div className="p-4 bg-gray-50 min-h-[400px]">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Agendamentos</div>
                    <div className="text-xl font-bold text-gray-900">12</div>
                    <div className="text-xs text-orange-600">Hoje</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Em Campo</div>
                    <div className="text-xl font-bold text-gray-900">5</div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Ativos
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Rotas Ativas</div>
                    <div className="text-xl font-bold text-gray-900">3</div>
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <Route className="w-3 h-3" /> Em execução
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Orçamentos</div>
                    <div className="text-xl font-bold text-gray-900">4</div>
                    <div className="text-xs text-amber-600">Pendentes</div>
                  </div>
                </div>
                
                {/* Map placeholder */}
                <div className="bg-white rounded-lg border shadow-sm mb-4 overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-blue-50 to-green-50 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-500">Mapa de Rastreamento</div>
                      </div>
                    </div>
                    {/* Simulated markers */}
                    <div className="absolute top-8 left-12">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">J</div>
                    </div>
                    <div className="absolute top-20 right-16">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">M</div>
                    </div>
                    <div className="absolute bottom-12 left-1/3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">C</div>
                    </div>
                  </div>
                </div>
                
                {/* Recent assignments */}
                <div className="bg-white rounded-lg border shadow-sm p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Próximos Atendimentos</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded bg-orange-50 border border-orange-100">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">João Silva</div>
                        <div className="text-xs text-gray-500">OS #1234 • Hospital Central</div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 text-xs">14:00</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-blue-50 border border-blue-100">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Maria Santos</div>
                        <div className="text-xs text-gray-500">OS #1235 • Shopping Plaza</div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">15:30</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </ScreenMockup>
          </div>
        </div>
      </section>

      {/* Module Carousel Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-orange-100 text-orange-700 mb-4">Módulos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tudo que você precisa para Field Service</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Do despacho ao orçamento aprovado. Cada módulo foi projetado para máxima eficiência em campo.
            </p>
          </div>

          <div 
            className="grid lg:grid-cols-2 gap-12 items-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Module Info */}
            <div className="order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <activeModule.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold">{activeModule.name}</h3>
              </div>
              <p className="text-lg text-gray-600 mb-6">{activeModule.description}</p>
              
              <div className="space-y-3 mb-8">
                {activeModule.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-2">
                  {moduleScreens.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === activeIndex ? "w-8 bg-orange-600" : "bg-gray-300 hover:bg-gray-400"
                      )}
                    />
                  ))}
                </div>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dynamic Screen Mockup */}
            <div className="order-1 lg:order-2">
              {activeModule.id === 'dispatch' && (
                <ScreenMockup title="TrakService — Agenda">
                  <div className="p-4 bg-gray-50 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Janeiro 2026</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Hoje</Button>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">+ Nova Atribuição</Button>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border shadow-sm p-4">
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                          <div key={day} className="text-center text-xs text-gray-500 font-medium">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[6, 7, 8, 9, 10].map(day => (
                          <div key={day} className={cn(
                            "p-2 rounded text-center",
                            day === 8 ? "bg-orange-100 border-2 border-orange-500" : "bg-gray-50"
                          )}>
                            <div className="text-sm font-medium">{day}</div>
                            {day === 8 && <div className="text-xs text-orange-600 mt-1">5 OS</div>}
                            {day === 9 && <div className="text-xs text-gray-500 mt-1">3 OS</div>}
                            {day === 10 && <div className="text-xs text-gray-500 mt-1">2 OS</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-2 h-10 rounded bg-green-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">João Silva</div>
                          <div className="text-xs text-gray-500">3 atendimentos</div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Em campo</Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-2 h-10 rounded bg-blue-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Maria Santos</div>
                          <div className="text-xs text-gray-500">2 atendimentos</div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">Agendado</Badge>
                      </div>
                    </div>
                  </div>
                </ScreenMockup>
              )}

              {activeModule.id === 'tracking' && (
                <ScreenMockup title="TrakService — Rastreamento">
                  <div className="p-4 bg-gray-50 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">5 técnicos online</div>
                      <Button size="sm" variant="outline">
                        <Target className="w-4 h-4 mr-2" />
                        Centralizar
                      </Button>
                    </div>
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                      <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 relative">
                        {/* Simulated map with markers */}
                        <div className="absolute inset-0">
                          <div className="absolute top-8 left-12">
                            <div className="relative">
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                <Car className="w-5 h-5" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
                            </div>
                          </div>
                          <div className="absolute top-24 right-20">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                              <Building2 className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="absolute bottom-16 left-1/3">
                            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                              <Car className="w-5 h-5" />
                            </div>
                          </div>
                          <div className="absolute bottom-24 right-8">
                            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg opacity-50">
                              <Car className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">João Silva</div>
                          <div className="text-xs text-gray-500">Em movimento • há 2 min</div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">Online</Badge>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Carlos Oliveira</div>
                          <div className="text-xs text-gray-500">No local • há 15 min</div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">No site</Badge>
                      </div>
                    </div>
                  </div>
                </ScreenMockup>
              )}

              {activeModule.id === 'routes' && (
                <ScreenMockup title="TrakService — Roteirização">
                  <div className="p-4 bg-gray-50 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Rota de Hoje</div>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        <Zap className="w-4 h-4 mr-2" />
                        Otimizar
                      </Button>
                    </div>
                    <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">João Silva</div>
                        <Badge className="bg-green-100 text-green-700">Em execução</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">5</div>
                          <div className="text-xs text-gray-500">Paradas</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">42 km</div>
                          <div className="text-xs text-gray-500">Distância</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">2h 30m</div>
                          <div className="text-xs text-gray-500">Tempo est.</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium line-through text-gray-400">Hospital Central</div>
                          <div className="text-xs text-gray-400">Concluído 09:30</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg border-2 border-orange-500">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Shopping Plaza</div>
                          <div className="text-xs text-orange-600">Em atendimento</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">3</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Escritório Alpha</div>
                          <div className="text-xs text-gray-500">Previsto 14:00</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">4</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Condomínio Beta</div>
                          <div className="text-xs text-gray-500">Previsto 15:30</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScreenMockup>
              )}

              {activeModule.id === 'mileage' && (
                <ScreenMockup title="TrakService — Quilometragem">
                  <div className="p-4 bg-gray-50 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">Janeiro 2026</div>
                      <Button size="sm" variant="outline">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 border shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Total KM</div>
                        <div className="text-lg font-bold text-gray-900">1.842</div>
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> -8%
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Custo Total</div>
                        <div className="text-lg font-bold text-gray-900">R$ 2.210</div>
                        <div className="text-xs text-gray-400">R$ 1,20/km</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Variância</div>
                        <div className="text-lg font-bold text-amber-600">4.2%</div>
                        <div className="text-xs text-gray-400">GPS vs Decl.</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border shadow-sm p-4">
                      <div className="text-xs font-medium text-gray-500 mb-3">Por Técnico</div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">João Silva</span>
                              <span>642 km</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '65%' }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Maria Santos</span>
                              <span>528 km</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '53%' }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Carlos Oliveira</span>
                              <span>672 km</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScreenMockup>
              )}

              {activeModule.id === 'quotes' && (
                <div className="flex justify-center">
                  <MobileMockup title="Orçamento">
                    <div className="p-3 min-h-[400px]">
                      <div className="bg-orange-50 rounded-lg p-3 mb-3">
                        <div className="text-xs text-gray-500">Cliente</div>
                        <div className="text-sm font-medium">Hospital Central</div>
                        <div className="text-xs text-gray-500 mt-1">Manutenção preventiva - Chiller</div>
                      </div>
                      
                      <div className="text-xs font-medium text-gray-500 mb-2">Itens</div>
                      <div className="space-y-2 mb-4">
                        <div className="bg-white rounded-lg p-2 border text-xs">
                          <div className="flex justify-between">
                            <span>Mão de obra (4h)</span>
                            <span className="font-medium">R$ 400,00</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border text-xs">
                          <div className="flex justify-between">
                            <span>Filtro HEPA</span>
                            <span className="font-medium">R$ 180,00</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-2 border text-xs">
                          <div className="flex justify-between">
                            <span>Deslocamento</span>
                            <span className="font-medium">R$ 50,00</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold text-lg">R$ 630,00</span>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-orange-600 hover:bg-orange-700" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Enviar para Aprovação
                      </Button>
                    </div>
                  </MobileMockup>
                </div>
              )}

              {activeModule.id === 'team' && (
                <ScreenMockup title="TrakService — Equipe">
                  <div className="p-4 bg-gray-50 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium">8 técnicos ativos</div>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        <Users className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border shadow-sm p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">JS</div>
                          <div className="flex-1">
                            <div className="font-medium">João Silva</div>
                            <div className="text-sm text-gray-500">Técnico Sênior</div>
                            <div className="flex gap-1 mt-1">
                              <Badge className="text-xs bg-teal-100 text-teal-700">HVAC</Badge>
                              <Badge className="text-xs bg-blue-100 text-blue-700">Chiller</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">98%</div>
                            <div className="text-xs text-gray-500">SLA</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border shadow-sm p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">MS</div>
                          <div className="flex-1">
                            <div className="font-medium">Maria Santos</div>
                            <div className="text-sm text-gray-500">Técnica Plena</div>
                            <div className="flex gap-1 mt-1">
                              <Badge className="text-xs bg-teal-100 text-teal-700">HVAC</Badge>
                              <Badge className="text-xs bg-purple-100 text-purple-700">VRF</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">95%</div>
                            <div className="text-xs text-gray-500">SLA</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border shadow-sm p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">CO</div>
                          <div className="flex-1">
                            <div className="font-medium">Carlos Oliveira</div>
                            <div className="text-sm text-gray-500">Técnico Júnior</div>
                            <div className="flex gap-1 mt-1">
                              <Badge className="text-xs bg-teal-100 text-teal-700">HVAC</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-amber-600">87%</div>
                            <div className="text-xs text-gray-500">SLA</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScreenMockup>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-orange-100 text-orange-700 mb-4">Benefícios</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Por que escolher o TrakService?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Transforme a gestão da sua equipe externa com ferramentas modernas e integradas.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-8 border">
              <h3 className="text-xl font-bold mb-6">Resultados Típicos</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Redução de tempo de deslocamento</span>
                    <span className="font-bold text-orange-600">-25%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Aumento de atendimentos/dia</span>
                    <span className="font-bold text-orange-600">+35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Orçamentos aprovados mais rápido</span>
                    <span className="font-bold text-orange-600">-50%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Economia em custos de KM</span>
                    <span className="font-bold text-orange-600">-18%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-orange-100 text-orange-700 mb-4">Integração</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Parte do Ecossistema ClimaTrak</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              O TrakService se integra perfeitamente com os outros módulos para uma operação completa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-teal-500">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">TrakNor CMMS</h3>
              <p className="text-gray-600 mb-4">
                Ordens de serviço e ativos sincronizados. Despache técnicos diretamente das OS.
              </p>
              <Link to="/produtos/traknor" className="text-teal-600 font-medium hover:underline flex items-center gap-1">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </Link>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">TrakSense IoT</h3>
              <p className="text-gray-600 mb-4">
                Alertas de sensores geram despachos automáticos para atendimento emergencial.
              </p>
              <Link to="/produtos/traksense" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </Link>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">TrakLedger Finance</h3>
              <p className="text-gray-600 mb-4">
                Orçamentos aprovados viram lançamentos automaticamente. Controle total de custos.
              </p>
              <Link to="/produtos/trakledger" className="text-emerald-600 font-medium hover:underline flex items-center gap-1">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-orange-500 text-white mb-4">App Mobile</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">Tudo na palma da mão</h2>
              <p className="text-lg text-gray-300 mb-8">
                Seus técnicos têm acesso completo pelo celular: agenda, rotas, orçamentos e mais. 
                Funciona mesmo offline.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">iOS e Android</div>
                    <div className="text-sm text-gray-400">Apps nativos de alta performance</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">GPS integrado</div>
                    <div className="text-sm text-gray-400">Navegação para cada atendimento</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">Offline-first</div>
                    <div className="text-sm text-gray-400">Funciona sem conexão, sincroniza depois</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <MobileMockup title="Minha Rota">
                <div className="p-3 min-h-[380px]">
                  <div className="bg-orange-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Hoje</div>
                        <div className="text-sm font-medium">5 atendimentos</div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 text-xs">2 concluídos</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-400 line-through">Hospital Central</div>
                        <div className="text-xs text-gray-400">09:00 - 10:30</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-400 line-through">Clínica São Lucas</div>
                        <div className="text-xs text-gray-400">11:00 - 11:45</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border-2 border-orange-500">
                      <Play className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <div className="text-xs font-medium">Shopping Plaza</div>
                        <div className="text-xs text-orange-600">Agora • OS #1234</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      <div className="flex-1">
                        <div className="text-xs font-medium">Escritório Alpha</div>
                        <div className="text-xs text-gray-500">14:00</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      <div className="flex-1">
                        <div className="text-xs font-medium">Condomínio Beta</div>
                        <div className="text-xs text-gray-500">16:00</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700" size="sm">
                    <Navigation className="w-4 h-4 mr-2" />
                    Navegar para próximo
                  </Button>
                </div>
              </MobileMockup>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-orange-600 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Quanto você gasta por mês com deslocamento improdutivo?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Empresas com o TrakService economizam em média R$ 15 mil/mês só em combustível e horas extras. 
            Agende uma demonstração e descubra seu potencial de economia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-orange-50">
                Calcular minha economia <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contato">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-orange-700">
                Falar com especialista
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-orange-200">
            ✓ App mobile gratuito  ✓ Setup em 3 dias  ✓ Treinamento incluso
          </p>
        </div>
      </section>
    </div>
  )
}
