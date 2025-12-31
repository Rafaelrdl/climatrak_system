import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Linkedin, Instagram, Youtube } from 'lucide-react'

const footerLinks = {
  produtos: [
    { name: 'TrakNor CMMS', href: '/produtos/traknor' },
    { name: 'TrakSense IoT', href: '/produtos/traksense' },
    { name: 'AirTrak Sensor', href: '/produtos/airtrak' },
  ],
  solucoes: [
    { name: 'Hospitais', href: '/solucoes#hospitais' },
    { name: 'Indústrias', href: '/solucoes#industrias' },
    { name: 'Shoppings & Facilities', href: '/solucoes#facilities' },
  ],
  empresa: [
    { name: 'Sobre nós', href: '/sobre' },
    { name: 'Blog', href: '/blog' },
    { name: 'Carreiras', href: '/carreiras' },
    { name: 'Contato', href: '/contato' },
  ],
  legal: [
    { name: 'Termos de uso', href: '/termos' },
    { name: 'Política de privacidade', href: '/privacidade' },
    { name: 'LGPD', href: '/lgpd' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <span className="text-xl font-bold">ClimaTrak</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Transformamos ativos em inteligência operacional com IoT + Software para gestão de manutenção e conformidade.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="mailto:contato@climatrak.com.br" className="flex items-center gap-2 hover:text-foreground">
                <Mail className="h-4 w-4" />
                contato@climatrak.com.br
              </a>
              <a href="tel:+5511999999999" className="flex items-center gap-2 hover:text-foreground">
                <Phone className="h-4 w-4" />
                (11) 99999-9999
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                São Paulo, SP - Brasil
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-4">Produtos</h3>
            <ul className="space-y-3">
              {footerLinks.produtos.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="font-semibold mb-4">Soluções</h3>
            <ul className="space-y-3">
              {footerLinks.solucoes.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ClimaTrak Tecnologia Ltda. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
