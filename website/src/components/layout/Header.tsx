import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, ClipboardList, Activity, DollarSign, Truck, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import logoClimatrak from '@/assets/logo_climatrak.svg'
import { marketingNavigation } from '@/content/marketingStructure'

const navigation = marketingNavigation.primary

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardList,
  Activity,
  DollarSign,
  Truck,
}

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
          <img src={logoClimatrak} alt="ClimaTrak" className="h-14 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) => {
            const hasChildren = 'children' in item
            const hasGroups = 'groups' in item
            const hasDropdown = hasChildren || hasGroups
            const groups = hasGroups ? item.groups : undefined
            const children = hasChildren ? item.children : undefined
            const isProductsMenu = item.name === 'Produtos'

            return (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => hasDropdown && setOpenDropdown(item.name)}
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
                  {hasDropdown && <ChevronDown className="h-4 w-4" />}
                </Link>

                {/* Dropdown Menu */}
                {hasDropdown && openDropdown === item.name && (
                  <div className="absolute left-0 top-full pt-2">
                    {isProductsMenu && groups ? (
                      // Products mega menu with modules and features - 2x2 grid
                      <div className="w-[900px] rounded-xl border bg-card shadow-xl overflow-hidden">
                        <div className="grid grid-cols-4 divide-x">
                          {groups.map((group) => {
                            const IconComponent = 'icon' in group && typeof group.icon === 'string' 
                              ? iconMap[group.icon] 
                              : null
                            const groupHref = 'href' in group ? group.href as string : '#'
                            
                            return (
                              <div key={group.name} className="p-4">
                                {/* Module Header */}
                                <Link
                                  to={groupHref}
                                  className="flex items-center gap-2 mb-4 group"
                                >
                                  {IconComponent && (
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                      <IconComponent className="w-5 h-5 text-primary" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                      {group.name}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </div>
                                </Link>
                                
                                {/* Features List */}
                                <div className="space-y-1">
                                  {group.items.map((feature) => (
                                    <Link
                                      key={feature.name}
                                      to={feature.href}
                                      className="block rounded-lg px-2 py-1.5 hover:bg-muted transition-colors group/item"
                                    >
                                      <div className="text-xs font-medium text-foreground group-hover/item:text-primary transition-colors">
                                        {feature.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                                        {feature.description}
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Footer */}
                        <div className="bg-muted/50 px-4 py-3 border-t">
                          <Link
                            to="/produtos"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            Ver todos os produtos
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ) : groups ? (
                      <div className="w-[520px] rounded-xl border bg-card p-4 shadow-lg grid gap-4 md:grid-cols-2">
                        {groups.map((group) => (
                          <div key={group.name} className="space-y-2">
                            <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {group.name}
                            </div>
                            {group.items.map((child) => (
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
                        ))}
                      </div>
                    ) : (
                      <div className="w-64 rounded-xl border bg-card p-2 shadow-lg">
                        {children?.map((child) => (
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
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          <Link to={marketingNavigation.cta.secondary.href}>
            <Button variant="ghost">{marketingNavigation.cta.secondary.name}</Button>
          </Link>
          <Link to={marketingNavigation.cta.primary.href}>
            <Button>{marketingNavigation.cta.primary.name}</Button>
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
            {navigation.map((item) => {
              const hasChildren = 'children' in item
              const hasGroups = 'groups' in item
              const groups = hasGroups ? item.groups : undefined
              const children = hasChildren ? item.children : undefined
              const isProductsMenu = item.name === 'Produtos'

              return (
                <div key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "block px-4 py-3 text-base font-medium rounded-lg",
                      isActive(item.href)
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => !hasChildren && !hasGroups && setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {isProductsMenu && groups ? (
                    <div className="pl-4 mt-2 space-y-4">
                      {groups.map((group) => {
                        const IconComponent = 'icon' in group && typeof group.icon === 'string' 
                          ? iconMap[group.icon] 
                          : null
                        const groupHref = 'href' in group ? group.href as string : '#'
                        
                        return (
                          <div key={group.name} className="space-y-1">
                            <Link
                              to={groupHref}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {IconComponent && <IconComponent className="w-4 h-4 text-primary" />}
                              {group.name}
                            </Link>
                            {group.items.map((child) => (
                              <Link
                                key={child.name}
                                to={child.href}
                                className="block px-4 py-2 pl-10 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ) : groups ? (
                    <div className="pl-4 mt-2 space-y-3">
                      {groups.map((group) => (
                        <div key={group.name} className="space-y-1">
                          <div className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.name}
                          </div>
                          {group.items.map((child) => (
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
                      ))}
                    </div>
                  ) : (
                    children && (
                      <div className="pl-4 mt-1 space-y-1">
                        {children.map((child) => (
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
                    )
                  )}
                </div>
              )
            })}
            <div className="pt-4 space-y-2 border-t">
              <Link to={marketingNavigation.cta.secondary.href} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">{marketingNavigation.cta.secondary.name}</Button>
              </Link>
              <Link to={marketingNavigation.cta.primary.href} onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">{marketingNavigation.cta.primary.name}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
