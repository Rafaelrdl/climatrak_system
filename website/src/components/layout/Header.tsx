import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Produtos',
    href: '/produtos',
    children: [
      { name: 'TrakNor CMMS', href: '/produtos/traknor', description: 'Sistema de gestão de manutenção' },
      { name: 'TrakSense IoT', href: '/produtos/traksense', description: 'Monitoramento em tempo real' },
      { name: 'AirTrak Sensor', href: '/produtos/airtrak', description: 'Sensor inteligente para HVAC' },
      { name: 'Finance', href: '/produtos/finance', description: 'Gestão financeira de manutenção' },
    ],
  },
  {
    name: 'Soluções',
    href: '/solucoes',
    children: [
      { name: 'Hospitais', href: '/solucoes#hospitais', description: 'Compliance ANVISA e gestão clínica' },
      { name: 'Indústrias', href: '/solucoes#industrias', description: 'Prevenção de downtime produtivo' },
      { name: 'Shoppings & Facilities', href: '/solucoes#facilities', description: 'Gestão multi-site' },
    ],
  },
  { name: 'Preços', href: '/precos' },
  { name: 'Sobre', href: '/sobre' },
  { name: 'Blog', href: '/blog' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const location = useLocation()

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-wide flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <span className="text-xl font-bold text-white">C</span>
          </div>
          <span className="text-xl font-bold text-foreground">ClimaTrak</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) => (
            <div
              key={item.name}
              className="relative"
              onMouseEnter={() => item.children && setOpenDropdown(item.name)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.name}
                {item.children && <ChevronDown className="h-4 w-4" />}
              </Link>

              {/* Dropdown Menu */}
              {item.children && openDropdown === item.name && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-64 rounded-xl border bg-card p-2 shadow-lg">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        className="block rounded-lg px-4 py-3 hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-foreground">{child.name}</div>
                        <div className="text-sm text-muted-foreground">{child.description}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          <Link to="/contato">
            <Button variant="ghost">Contato</Button>
          </Link>
          <Link to="/demo">
            <Button>Agendar Demo</Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-muted"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <div className="container-wide py-4 space-y-2">
            {navigation.map((item) => (
              <div key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "block px-4 py-3 text-base font-medium rounded-lg",
                    isActive(item.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => !item.children && setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
                {item.children && (
                  <div className="pl-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 space-y-2 border-t">
              <Link to="/contato" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Contato</Button>
              </Link>
              <Link to="/demo" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Agendar Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
