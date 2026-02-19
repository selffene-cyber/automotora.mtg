// ============================================================
// Site Header Component - MTG Automotora
// Global navigation header with mobile responsive hamburger menu
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import Image from 'next/image';

// Navigation items
const navItems = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/subastas', label: 'Subastas' },
  { href: '/rifas', label: 'Rifas' },
  { href: '/vender', label: 'Vender' },
  { href: '/contacto', label: 'Contacto' },
];

interface SiteHeaderProps {
  variant?: 'public' | 'admin';
}

export function SiteHeader({ variant = 'public' }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track scroll for subtle shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    // Close mobile menu when clicking a link
    const sheet = document.querySelector('[data-state="open"]');
    if (sheet) {
      // Sheet will close automatically
    }
  };

  // For admin variant, we use a simpler header
  if (variant === 'admin') {
    return (
      <header 
        className={cn(
          "sticky top-0 z-50 h-16 border-b bg-background transition-shadow duration-200",
          isScrolled ? "shadow-sm" : "shadow-none",
          "border-neutral-200"
        )}
      >
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/elemento-mtg.png"
              alt="MTG"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-sm font-medium text-muted-foreground">Admin</span>
          </Link>

          {/* Desktop Navigation - Admin Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors relative py-1",
                  isActive(item.href)
                    ? "text-mtg-electric"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mtg-electric rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button asChild size="sm">
              <Link href="/catalogo">Ver Catálogo</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <span className="text-xl font-bold text-mtg-deep">MTG</span>
                  </SheetTitle>
                </SheetHeader>
                
                <nav className="mt-6 flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-mtg-electric/10 text-mtg-electric"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {item.label}
                      {isActive(item.href) && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  ))}
                  
                  <div className="my-4 border-t" />
                  
                  <Button asChild className="w-full justify-start">
                    <Link href="/catalogo" onClick={handleLinkClick}>
                      Ver Catálogo
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start mt-2" asChild>
                    <Link href="/" onClick={handleLinkClick}>
                      Ver Sitio Público
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>
    );
  }

  // Public variant (default)
  return (
    <header 
      className={cn(
        "sticky top-0 z-50 h-16 border-b bg-background transition-shadow duration-200",
        isScrolled ? "shadow-sm" : "shadow-none",
        "border-neutral-200"
      )}
    >
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/elemento-mtg.png"
            alt="MTG Automotora"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors relative py-1",
                isActive(item.href)
                  ? "text-mtg-electric"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {isActive(item.href) && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mtg-electric rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <Button asChild size="sm">
            <Link href="/catalogo">Ver Catálogo</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Image
                    src="/elemento-mtg.png"
                    alt="MTG"
                    width={80}
                    height={32}
                    className="h-8 w-auto"
                  />
                </SheetTitle>
              </SheetHeader>
              
              <nav className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-mtg-electric/10 text-mtg-electric"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {item.label}
                    {isActive(item.href) && <ChevronRight className="h-4 w-4" />}
                  </Link>
                ))}
                
                <div className="my-4 border-t" />
                
                <Button asChild className="w-full justify-start">
                  <Link href="/catalogo" onClick={handleLinkClick}>
                    Ver Catálogo
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}

export default SiteHeader;
