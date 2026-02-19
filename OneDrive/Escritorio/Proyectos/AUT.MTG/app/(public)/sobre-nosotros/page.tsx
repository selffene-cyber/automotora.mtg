// ============================================================
// Sobre Nosotros - MTG Automotora
// Página de marca con historia, valores, pilares y tecnología
// ============================================================

import Link from 'next/link';
import { 
  Lightbulb, 
  ShieldCheck, 
  Lock, 
  Zap,
  TrendingUp,
  Store,
  Users,
  Package,
  Gavel,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard
} from 'lucide-react';

export const metadata = {
  title: 'Sobre Nosotros - MTG Automotora',
  description: 'Conoce la visión y misión de MTG Automotora. Democratizamos el acceso al mercado automotriz de alta calidad a través de tecnología de vanguardia.',
};

export default function SobreNosotrosPage() {
  return (
    <div className="min-h-screen">
      {/* ============================================================
          HERO SECTION
          Gradient background: Azul Eléctrico (#0084FF) to Azul Profundo (#1A4B8F)
      ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0084FF] via-[#0066CC] to-[#1A4B8F] py-24 md:py-32">
        {/* Decorative elements - Fine line art */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-px h-40 bg-white/20" />
          <div className="absolute top-40 right-20 w-px h-60 bg-white/10" />
          <div className="absolute bottom-20 left-1/4 w-40 h-px bg-white/10" />
          <div className="absolute bottom-40 right-1/3 w-60 h-px bg-white/20" />
          <div className="absolute top-1/4 right-1/4 w-20 h-20 border border-white/10 rounded-full" />
          <div className="absolute bottom-1/3 left-20 w-32 h-32 border border-white/5 rounded-full" />
        </div>
        
        <div className="container px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="scroll-m-20 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance mb-6">
              Reinventando el futuro automotriz
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Transformamos la experiencia de comprar y vender vehículos usados 
              mediante tecnología de punta y procesos transparentes.
            </p>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-24">
          <svg 
            viewBox="0 0 1440 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 w-full h-full"
          >
            <path 
              d="M0 50 C360 100 720 0 1080 50 C1260 75 1380 75 1440 50 L1440 100 L0 100 Z" 
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ============================================================
          NUESTRA HISTORIA / PROPÓSITO
      ============================================================ */}
      <section className="py-20 md:py-28">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[#0084FF] bg-[#0084FF]/10 rounded-full border border-[#0084FF]/20">
                Quiénes Somos
              </span>
              <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-[#1A4B8F] text-balance mb-4">
                Nuestra Esencia
              </h2>
              <div className="w-16 h-1 mx-auto bg-gradient-to-r from-[#0084FF] to-[#1A4B8F] rounded-full" />
            </div>

            {/* Propósito, Misión, Visión Cards */}
            <div className="grid gap-8">
              {/* Propósito */}
              <div className="group p-8 rounded-2xl border border-neutral-200 bg-white hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0084FF]/5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-[#0084FF]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1A4B8F] mb-3">Propósito</h3>
                    <p className="text-neutral-600 leading-relaxed">
                      Democratizar y profesionalizar el acceso al mercado automotriz de alta calidad 
                      a través de la <strong>transparencia tecnológica</strong>, eliminando la 
                      incertidumbre en la compra y venta de vehículos usados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Misión */}
              <div className="group p-8 rounded-2xl border border-neutral-200 bg-white hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0084FF]/5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#0084FF]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1A4B8F] mb-3">Misión</h3>
                    <p className="text-neutral-600 leading-relaxed">
                      Ofrecer una <strong>plataforma digital integral</strong> que gestione con 
                      precisión cada etapa del ciclo de vida automotriz —desde la recepción e 
                      inspección técnica hasta la venta final por subasta o reserva— asegurando 
                      transacciones seguras y eficientes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visión */}
              <div className="group p-8 rounded-2xl border border-neutral-200 bg-white hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#0084FF]/5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[#0084FF]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1A4B8F] mb-3">Visión</h3>
                    <p className="text-neutral-600 leading-relaxed">
                      Ser el <strong>estándar de oro</strong> en la gestión automotriz digital, 
                      donde la confianza del usuario esté respaldada por procesos automatizados 
                      y una interfaz de vanguardia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          VALORES CORE (Grid 4) - Glassmorphism
      ============================================================ */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[#0084FF] bg-[#0084FF]/10 rounded-full border border-[#0084FF]/20">
               Qué Nos Move
              </span>
              <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-[#1A4B8F] text-balance mb-4">
                Valores que nos definen
              </h2>
              <p className="text-neutral-500 max-w-2xl mx-auto">
                Los pilares fundamentales que guían cada decisión y proceso de nuestra empresa.
              </p>
            </div>

            {/* Valores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Innovación */}
              <div className="group p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0084FF]/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#1A4B8F] flex items-center justify-center shadow-lg">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A4B8F]">Innovación</h3>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Uso de <strong>tecnologías de borde</strong> como Next.js 14 y Cloudflare D1 
                  para ofrecer velocidad, seguridad y escalabilidad sin precedentes.
                </p>
              </div>

              {/* Transparencia */}
              <div className="group p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0084FF]/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#1A4B8F] flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A4B8F]">Transparencia</h3>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  <strong>Validación rigurosa</strong> de documentos y estados reales del 
                  vehículo. Cada información es verificada antes de publicarse.
                </p>
              </div>

              {/* Seguridad */}
              <div className="group p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0084FF]/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#1A4B8F] flex items-center justify-center shadow-lg">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A4B8F]">Seguridad</h3>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  <strong>Procesos de pago verificados</strong> y gestión de riesgos proactiva 
                  para proteger tanto a compradores como vendedores.
                </p>
              </div>

              {/* Eficiencia */}
              <div className="group p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 hover:border-[#0084FF]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0084FF]/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#1A4B8F] flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A4B8F]">Eficiencia</h3>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Reducir el tiempo en inventario a <strong>menos de 30 días</strong> mediante 
                  un ecosistema digital optimizado y procesos ágiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PILARES DEL NEGOCIO (Grid 4)
      ============================================================ */}
      <section className="py-20 md:py-28">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[#0084FF] bg-[#0084FF]/10 rounded-full border border-[#0084FF]/20">
                Lo Que Ofrecemos
              </span>
              <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-[#1A4B8F] text-balance mb-4">
                Pilares de nuestro negocio
              </h2>
              <p className="text-neutral-500 max-w-2xl mx-auto">
                Soluciones integrales para cada necesidad del mercado automotriz.
              </p>
            </div>

            {/* Pilares Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Consignación Profesional */}
              <div className="group p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#1A4B8F]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#1A4B8F]/5 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1A4B8F]/10 flex items-center justify-center group-hover:bg-[#1A4B8F] transition-colors duration-300">
                  <Store className="w-8 h-8 text-[#1A4B8F] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-[#1A4B8F] mb-2">Consignación Profesional</h3>
                <p className="text-sm text-neutral-500">
                  Deja tu vehículo en manos expertas. Nosotros nos encargamos de la venta.
                </p>
              </div>

              {/* Subastas Públicas */}
              <div className="group p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#1A4B8F]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#1A4B8F]/5 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1A4B8F]/10 flex items-center justify-center group-hover:bg-[#1A4B8F] transition-colors duration-300">
                  <Gavel className="w-8 h-8 text-[#1A4B8F] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-[#1A4B8F] mb-2">Subastas Públicas</h3>
                <p className="text-sm text-neutral-500">
                  Puja en tiempo real y obtén el mejor precio por tu próximo vehículo.
                </p>
              </div>

              {/* Venta Directa */}
              <div className="group p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#1A4B8F]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#1A4B8F]/5 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1A4B8F]/10 flex items-center justify-center group-hover:bg-[#1A4B8F] transition-colors duration-300">
                  <Users className="w-8 h-8 text-[#1A4B8F] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-[#1A4B8F] mb-2">Venta Directa</h3>
                <p className="text-sm text-neutral-500">
                  Compra directamente vehículos verificados con garantía de calidad.
                </p>
              </div>

              {/* Gestión de Inventario */}
              <div className="group p-6 rounded-2xl border border-neutral-200 bg-white hover:border-[#1A4B8F]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#1A4B8F]/5 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1A4B8F]/10 flex items-center justify-center group-hover:bg-[#1A4B8F] transition-colors duration-300">
                  <Package className="w-8 h-8 text-[#1A4B8F] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-[#1A4B8F] mb-2">Gestión de Inventario</h3>
                <p className="text-sm text-neutral-500">
                  Control total de tu flota con seguimiento en tiempo real y reportes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STACK TECNOLÓGICO
      ============================================================ */}
      <section className="py-20 md:py-28 bg-neutral-900 text-white">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[#0084FF] bg-[#0084FF]/10 rounded-full border border-[#0084FF]/20">
                Nuestra Tecnología
              </span>
              <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-white text-balance mb-4">
                Stack tecnológico de vanguardia
              </h2>
              <p className="text-neutral-400 max-w-2xl mx-auto">
                Utilizamos las tecnologías más modernas para garantizar rendimiento, seguridad y escalabilidad.
              </p>
            </div>

            {/* Tech Stack Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Next.js 14 */}
              <div className="p-6 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:border-[#0084FF]/50 transition-all duration-300 text-center group">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold text-white mb-1">Next.js 14</h3>
                <p className="text-xs text-neutral-400">Framework React</p>
              </div>

              {/* Cloudflare Pages */}
              <div className="p-6 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:border-[#0084FF]/50 transition-all duration-300 text-center group">
                <div className="text-3xl mb-3">☁️</div>
                <h3 className="font-bold text-white mb-1">Cloudflare Pages</h3>
                <p className="text-xs text-neutral-400">Hosting Edge</p>
              </div>

              {/* D1 Database */}
              <div className="p-6 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:border-[#0084FF]/50 transition-all duration-300 text-center group">
                <div className="text-3xl mb-3">🗄️</div>
                <h3 className="font-bold text-white mb-1">D1 Database</h3>
                <p className="text-xs text-neutral-400">Base de Datos SQL</p>
              </div>

              {/* R2 Storage */}
              <div className="p-6 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:border-[#0084FF]/50 transition-all duration-300 text-center group">
                <div className="text-3xl mb-3">📦</div>
                <h3 className="font-bold text-white mb-1">R2 Storage</h3>
                <p className="text-xs text-neutral-400">Almacenamiento Blob</p>
              </div>
            </div>

            {/* Fine line decoration */}
            <div className="mt-12 flex items-center justify-center gap-4">
              <div className="h-px w-20 bg-neutral-700" />
              <div className="w-2 h-2 rounded-full bg-[#0084FF]" />
              <div className="h-px w-20 bg-neutral-700" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MÉTRICAS DE CONFIANZA
      ============================================================ */}
      <section className="py-20 md:py-28">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-[#0084FF] bg-[#0084FF]/10 rounded-full border border-[#0084FF]/20">
                Por Qué Confiar en Nosotros
              </span>
              <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-[#1A4B8F] text-balance mb-4">
                Métricas que nos respaldan
              </h2>
              <p className="text-neutral-500 max-w-2xl mx-auto">
                Números que demuestran nuestro compromiso con la excelencia.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Ventas en menos de 30 días */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-[#0084FF]/5 to-[#1A4B8F]/5 border border-[#0084FF]/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0084FF] flex items-center justify-center">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#1A4B8F]">&lt;30 días</div>
                    <div className="text-sm text-neutral-500">Tiempo promedio de venta</div>
                  </div>
                </div>
                <p className="text-neutral-600">
                  Nuestro ecosistema digital optimizado garantiza que tu vehículo se venda 
                  rápidamente, reduciendo el tiempo en inventario al mínimo.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Visibilidad máxima en catálogo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Promoción en subastas activas
                  </li>
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Pricing inteligente basado en mercado
                  </li>
                </ul>
              </div>

              {/* Confirmación de pago segura via Webhooks */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-[#0084FF]/5 to-[#1A4B8F]/5 border border-[#0084FF]/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#1A4B8F] flex items-center justify-center">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#1A4B8F]">100%</div>
                    <div className="text-sm text-neutral-500">Pagos verificados</div>
                  </div>
                </div>
                <p className="text-neutral-600">
                  Sistema de confirmación de pagos mediante <strong>webhooks seguros</strong> 
                  que garantizan la integridad de cada transacción.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Verificación en tiempo real
                  </li>
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Cifrado SSL/TLS
                  </li>
                  <li className="flex items-center gap-2 text-sm text-neutral-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Reconciliación automática
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA SECTION
      ============================================================ */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-[#0084FF] to-[#1A4B8F]">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="scroll-m-20 text-3xl md:text-4xl font-bold tracking-tight text-white text-balance mb-6">
              ¿Listo para transformar tu experiencia automotriz?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Explora nuestro catálogo o agenda una asesoría personalizada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/catalogo" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1A4B8F] font-semibold rounded-xl hover:bg-neutral-100 transition-colors"
              >
                Ver Catálogo
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/vender" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1A4B8F]/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-[#1A4B8F]/30 transition-colors"
              >
                Vender mi Vehículo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
