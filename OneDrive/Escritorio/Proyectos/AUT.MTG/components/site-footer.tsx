// ============================================================
// Site Footer Component - MTG Automotora
// Footer with logo, quick links, and contact info
// ============================================================

import Link from 'next/link';
import Image from 'next/image';

const quickLinks = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/subastas', label: 'Subastas' },
  { href: '/rifas', label: 'Rifas' },
  { href: '/vender', label: 'Vender' },
  { href: '/sobre-nosotros', label: 'Sobre Nosotros' },
];

const infoLinks = [
  { href: '/terminos', label: 'Términos y Condiciones' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/contacto', label: 'Contacto' },
];

export function SiteFooter() {
  return (
    <footer className="bg-neutral-900 text-white">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/Logo MTG Horizontal.png"
                alt="MTG Automotora"
                width={180}
                height={60}
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Tu mejor opción para comprar y vender vehículos en Chile. 
              Amplio catálogo, subastas en vivo y rifas exclusivas.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">Navegación</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information Links */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">Información</h3>
            <ul className="space-y-3">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">Contacto</h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li>
                <a 
                  href="mailto:gerencia@mtg.cl"
                  className="hover:text-white transition-colors"
                >
                  gerencia@mtg.cl
                </a>
              </li>
              <li>
                <a 
                  href="mailto:ventas@mtg.cl"
                  className="hover:text-white transition-colors"
                >
                  ventas@mtg.cl
                </a>
              </li>
              <li>
                <span className="text-white">+56 9 1234 5678</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-500 text-sm">
              © {new Date().getFullYear()} MTG Automotora. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6">
              <Link 
                href="/terminos" 
                className="text-neutral-500 hover:text-white text-sm transition-colors"
              >
                Términos
              </Link>
              <Link 
                href="/privacidad" 
                className="text-neutral-500 hover:text-white text-sm transition-colors"
              >
                Privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
