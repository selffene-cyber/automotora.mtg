// ============================================================
// Página Pública: Vende tu Auto con MTG
// MTG Automotora - Consignación Online
// ============================================================

import { ConsignmentForm } from '@/components/consignment-form';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  TrendingUp,
  Camera,
  Clock,
  Users,
  BadgeCheck,
} from 'lucide-react';

export const metadata = {
  title: 'Vende tu Auto | MTG Automotora',
  description:
    'Consigna tu vehículo con MTG Automotora. Nos encargamos de todo: fotos profesionales, publicación y venta. Sin complicaciones.',
};

const benefits = [
  {
    icon: Camera,
    title: 'Fotos Profesionales',
    description: 'Fotografiamos tu auto con estándares de calidad premium para maximizar su atractivo.',
  },
  {
    icon: TrendingUp,
    title: 'Mejor Precio',
    description: 'Nuestro equipo comercial trabaja para obtener el mejor valor de mercado por tu vehículo.',
  },
  {
    icon: Shield,
    title: 'Proceso Seguro',
    description: 'Toda la documentación y transferencia se realiza de forma legal y transparente.',
  },
  {
    icon: Clock,
    title: 'Venta Rápida',
    description: 'Publicamos en múltiples canales para acelerar la venta de tu auto.',
  },
  {
    icon: Users,
    title: 'Red de Compradores',
    description: 'Accede a nuestra amplia base de clientes interesados en comprar.',
  },
  {
    icon: BadgeCheck,
    title: 'Sin Complicaciones',
    description: 'Nos encargamos de todo: inspección, publicación, negociación y cierre.',
  },
];

export default function VenderPage() {
  return (
    <main className="min-h-screen">
      {/* ============================================================ */}
      {/* Hero Section */}
      {/* ============================================================ */}
      <section className="relative bg-gradient-to-b from-background to-accent/30 py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl">
              Vende tu auto con MTG
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              Consigna tu vehículo con nosotros y déjanos encargarnos de todo.
              Proceso simple, seguro y al mejor precio del mercado.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Benefits Section */}
      {/* ============================================================ */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-center mb-8">
            ¿Por qué consignar con nosotros?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-4 p-4 rounded-lg border border-input bg-card shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ============================================================ */}
      {/* Form Section */}
      {/* ============================================================ */}
      <section className="py-12 md:py-16 bg-accent/20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              Solicita tu consignación
            </h2>
            <p className="text-muted-foreground mt-2">
              Completa los datos de tu vehículo y te contactaremos en menos de 24 horas
            </p>
          </div>
          <ConsignmentForm />
        </div>
      </section>

      {/* ============================================================ */}
      {/* How it works */}
      {/* ============================================================ */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-center mb-10">
            ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Envía tu solicitud', desc: 'Completa el formulario con los datos de tu vehículo.' },
              { step: '2', title: 'Evaluación', desc: 'Nuestro equipo revisa y evalúa tu auto.' },
              { step: '3', title: 'Publicación', desc: 'Fotografiamos y publicamos tu vehículo en nuestros canales.' },
              { step: '4', title: 'Venta', desc: 'Gestionamos la venta y te transferimos el pago.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="font-medium mt-3 text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
