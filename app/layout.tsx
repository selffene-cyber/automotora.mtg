import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MTG Automotora | Vehículos en Venta Chile',
  description: 'MTG Automotora - Tu mejor opción para comprar y vender vehículos en Chile. Amplio catálogo, subastas en vivo y rifas exclusivas.',
  keywords: 'automotora, vehículos, autos, Chile, comprar auto, vender auto, subastas, rifas, MTG',
  manifest: '/manifest.json',
  openGraph: {
    title: 'MTG Automotora | Vehículos en Venta Chile',
    description: 'Tu mejor opción para comprar y vender vehículos en Chile',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MTG',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/Elemento MTG.ico" type="image/x-icon" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
