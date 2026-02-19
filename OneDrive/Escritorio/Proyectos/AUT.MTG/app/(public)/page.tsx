// ============================================================
// Página Principal - Homepage MTG Automotora
// Enhanced with Commercial Sections
// ============================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Car, 
  Gavel, 
  Ticket, 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import FeaturedCarousel from '@/components/featured-carousel';
import PromoBanners from '@/components/promo-banners';
import HowItWorks from '@/components/how-it-works';
import TrustMetrics from '@/components/trust-metrics';

// Servicios principales para Bento Grid
const services = [
  {
    icon: Car,
    title: 'Catálogo de Vehículos',
    description: 'Explora nuestro amplio inventario de vehículos disponibles. Filtros avanzados para encontrar el auto perfecto.',
    link: '/catalogo',
    linkText: 'Ver Catálogo',
    size: 'large' as const,
  },
  {
    icon: Gavel,
    title: 'Subastas en Vivo',
    description: 'Participa en nuestras subastas y encuentra increíbles oportunidades. Pujas seguras y transparentes.',
    link: '/subastas',
    linkText: 'Ver Subastas',
    size: 'medium' as const,
  },
  {
    icon: Ticket,
    title: 'Rifas Exclusivas',
    description: 'Participa y gana vehículos exclusivos.',
    link: '/rifas',
    linkText: 'Ver Rifas',
    size: 'medium' as const,
  },
  {
    icon: TrendingUp,
    title: 'Vende tu Auto',
    description: 'Consigna tu vehículo con nosotros.',
    link: '/vender',
    linkText: 'Consignar',
    size: 'small' as const,
  },
];

// Beneficios
const benefits = [
  {
    icon: Shield,
    title: 'Compra Segura',
    description: 'Todos nuestros vehículos pasan por revisión técnica y verificación de documentación.',
  },
  {
    icon: Clock,
    title: 'Atención Personalizada',
    description: 'Nuestro equipo te acompaña en todo el proceso de compra o venta.',
  },
  {
    icon: CheckCircle2,
    title: 'Gestión Completa',
    description: 'Nos encargamos de la transferencia, permits y documentación.',
  },
  {
    icon: Star,
    title: 'Garantía MTG',
    description: 'Vehículos con respaldo y soporte post-venta.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================ */}
      {/* Hero Section - 2-Column Layout */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden border-b border-neutral-200">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-neutral-50/30 to-white" />
        
        {/* Fine-line pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative container px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Headline & CTAs */}
            <div className="text-center lg:text-left space-y-6">
              {/* Logo/Brand */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <Image 
                  src="/Logo MTG.png" 
                  alt="MTG Automotora" 
                  width={120}
                  height={60}
                  className="h-16 w-auto object-contain"
                />
              </div>
              
              {/* Main Title */}
              <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-balance text-[#1A4B8F]">
                MTG Automotora
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg md:text-xl text-neutral-500 text-balance max-w-xl mx-auto lg:mx-0">
                Tu mejor opción para comprar y vender vehículos en Chile. 
                Amplio catálogo, subastas en vivo y rifas exclusivas.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Button asChild size="lg" className="w-full sm:w-auto bg-[#0084FF] hover:bg-[#0084FF]/90 text-white shadow-md hover:shadow-lg transition-all duration-200 glow-hover">
                  <Link href="/catalogo">
                    Ver Catálogo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-neutral-200 text-[#1A4B8F] hover:bg-[#1A4B8F] hover:text-white hover:border-[#1A4B8F] transition-all duration-200">
                  <Link href="/vender">
                    Publicar vehículo
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Vehicle Cards Composition */}
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {/* Main large card */}
                <div className="col-span-2">
                  <Card className="overflow-hidden border-neutral-200 shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                    <div className="relative aspect-[16/9] bg-gradient-to-br from-[#0084FF]/10 to-[#1A4B8F]/5">
                      <Image 
                        src="/Logo MTG.png" 
                        alt="Vehículos destacados"
                        fill
                        className="object-contain p-8 opacity-80"
                      />
                      <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[#1A4B8F]">
                          Catálogo premium
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Small card 1 */}
                <Card className="overflow-hidden border-neutral-200 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
                  <div className="relative aspect-square bg-emerald-50/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className="h-12 w-12 text-emerald-500 opacity-50" />
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="text-sm font-semibold text-[#1A4B8F]">Vender</span>
                    </div>
                  </div>
                </Card>

                {/* Small card 2 */}
                <Card className="overflow-hidden border-neutral-200 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
                  <div className="relative aspect-square bg-purple-50/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gavel className="h-12 w-12 text-purple-500 opacity-50" />
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="text-sm font-semibold text-[#1A4B8F]">Subastas</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Featured Carousel - Más Baratos */}
      {/* ============================================================ */}
      <FeaturedCarousel />

      {/* ============================================================ */}
      {/* Promo Banners */}
      {/* ============================================================ */}
      <PromoBanners />

      {/* ============================================================ */}
      {/* How It Works */}
      {/* ============================================================ */}
      <HowItWorks />

      {/* ============================================================ */}
      {/* Trust Metrics */}
      {/* ============================================================ */}
      <TrustMetrics />

      <Separator className="bg-neutral-200" />

      {/* ============================================================ */}
      {/* Bento Grid Services Section */}
      {/* ============================================================ */}
      <section className="container px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-balance text-[#1A4B8F]">
            ¿Qué buscas hoy?
          </h2>
          <p className="text-neutral-500 mt-2">
            Explora todas nuestras opciones para encontrar tu próximo vehículo
          </p>
        </div>
        
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 gap-4 auto-rows-min">
          {/* Large Card - Catálogo */}
          <Card className="md:col-span-2 md:row-span-2 group cursor-pointer card-hover border-neutral-200 hover:border-[#0084FF]/30">
            <CardHeader className="pb-3">
              <div className="h-12 w-12 rounded-lg bg-[#0084FF]/10 flex items-center justify-center mb-3 group-hover:bg-[#0084FF]/20 transition-colors">
                <Car className="h-6 w-6 text-[#0084FF]" />
              </div>
              <h3 className="font-semibold text-xl tracking-tight text-[#1A4B8F]">
                {services[0].title}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-neutral-500">
                {services[0].description}
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[#0084FF]">
                <Link href={services[0].link}>
                  {services[0].linkText}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Medium Card - Subastas */}
          <Card className="md:col-span-2 md:row-span-1 group cursor-pointer card-hover border-neutral-200 hover:border-[#0084FF]/30">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center mb-2 group-hover:bg-[#0084FF]/20 transition-colors">
                <Gavel className="h-5 w-5 text-[#0084FF]" />
              </div>
              <h3 className="font-semibold text-lg tracking-tight text-[#1A4B8F]">
                {services[1].title}
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                {services[1].description}
              </p>
            </CardContent>
          </Card>

          {/* Medium Card - Rifas */}
          <Card className="md:col-span-1 md:row-span-1 group cursor-pointer card-hover border-neutral-200 hover:border-[#0084FF]/30">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center mb-2 group-hover:bg-[#0084FF]/20 transition-colors">
                <Ticket className="h-5 w-5 text-[#0084FF]" />
              </div>
              <h3 className="font-semibold text-lg tracking-tight text-[#1A4B8F]">
                {services[2].title}
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                {services[2].description}
              </p>
            </CardContent>
          </Card>

          {/* Small Card - Vender */}
          <Card className="md:col-span-1 md:row-span-1 group cursor-pointer card-hover border-neutral-200 hover:border-[#0084FF]/30">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center mb-2 group-hover:bg-[#0084FF]/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-[#0084FF]" />
              </div>
              <h3 className="font-semibold text-lg tracking-tight text-[#1A4B8F]">
                {services[3].title}
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                {services[3].description}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="bg-neutral-200" />

      {/* ============================================================ */}
      {/* Why Choose Us Section */}
      {/* ============================================================ */}
      <section className="container px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-balance text-[#1A4B8F]">
            ¿Por qué elegir MTG?
          </h2>
          <p className="text-neutral-500 mt-2">
            Compromiso y calidad en cada transacción
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit) => (
            <div 
              key={benefit.title}
              className="flex flex-col items-center text-center p-6 rounded-lg border border-neutral-200 bg-white hover:border-[#0084FF]/20 hover:shadow-md transition-all duration-200 card-hover"
            >
              <div className="h-12 w-12 rounded-full bg-[#0084FF]/10 flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-[#0084FF]" />
              </div>
              <h3 className="font-semibold mb-2 text-[#1A4B8F]">
                {benefit.title}
              </h3>
              <p className="text-sm text-neutral-500">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="bg-neutral-200" />

      {/* ============================================================ */}
      {/* CTA Section */}
      {/* ============================================================ */}
      <section className="container px-4 py-12 md:py-16">
        <div className="bg-gradient-to-r from-[#1A4B8F]/5 via-[#0084FF]/5 to-[#1A4B8F]/5 rounded-2xl p-8 md:p-12 border border-neutral-200">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-balance text-[#1A4B8F]">
              ¿Listo para encontrar tu próximo vehículo?
            </h2>
            <p className="text-neutral-500">
              Contáctanos hoy mismo y nuestro equipo te ayudará a encontrar 
              exactamente lo que buscas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-[#0084FF] hover:bg-[#0084FF]/90 shadow-md hover:shadow-lg transition-all duration-200 glow-hover">
                <Link href="/catalogo">
                  Explorar Catálogo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-neutral-200 text-[#1A4B8F] hover:bg-[#1A4B8F] hover:text-white hover:border-[#1A4B8F] transition-all duration-200">
                <Link href="/vender">
                  Consignar Vehículo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Contact Section */}
      {/* ============================================================ */}
      <section className="container px-4 py-12 md:py-16 border-t border-neutral-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold tracking-tight text-[#1A4B8F]">
              Contáctanos
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 border border-neutral-200 rounded-lg hover:border-[#0084FF]/20 hover:shadow-sm transition-all duration-200">
              <Phone className="h-5 w-5 text-[#0084FF] mb-3" />
              <h3 className="font-medium text-sm text-[#1A4B8F]">Teléfono</h3>
              <p className="text-sm text-neutral-500 mt-1">+56 9 XXXX XXXX</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border border-neutral-200 rounded-lg hover:border-[#0084FF]/20 hover:shadow-sm transition-all duration-200">
              <Mail className="h-5 w-5 text-[#0084FF] mb-3" />
              <h3 className="font-medium text-sm text-[#1A4B8F]">Email</h3>
              <p className="text-sm text-neutral-500 mt-1">contacto@mastg.cl</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 border border-neutral-200 rounded-lg hover:border-[#0084FF]/20 hover:shadow-sm transition-all duration-200">
              <MapPin className="h-5 w-5 text-[#0084FF] mb-3" />
              <h3 className="font-medium text-sm text-[#1A4B8F]">Ubicación</h3>
              <p className="text-sm text-neutral-500 mt-1">Santiago, Chile</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Footer */}
      {/* ============================================================ */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image 
                src="/elemento-mtg.png" 
                alt="MTG Automotora" 
                width={32} 
                height={32}
                className="h-8 w-auto object-contain"
              />
              <span className="font-semibold text-[#1A4B8F]">MTG Automotora</span>
            </div>
            
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} MTG Automotora. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
