// ============================================================
// Admin Layout - MTG Automotora
// Layout with Sidebar (Desktop) and Bottom Navigation (Mobile)
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SiteHeader } from '@/components/site-header';

// Navigation items
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/reservas', label: 'Reservas', icon: Calendar },
];

const bottomNavItems = [
  { href: '/admin', label: 'Inicio', icon: LayoutDashboard },
  { href: '/admin/vehiculos', label: 'Autos', icon: Car },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/reservas', label: 'Reservas', icon: Calendar },
];

// Types
interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          // Only redirect if not on login page
          if (!pathname.includes('/login')) {
            router.push('/admin/login');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        if (!pathname.includes('/login')) {
          router.push('/admin/login');
        }
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render sidebar (redirect will happen in useEffect)
  const showSidebar = isAuthenticated && !isMobile;
  const showMobileNav = isAuthenticated && isMobile;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {showSidebar && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/admin" className="flex items-center gap-3">
              <Image 
                src="/elemento-mtg.png" 
                alt="MTG Automotora" 
                width={36} 
                height={36}
                className="h-9 w-auto object-contain"
              />
              <span className="text-xl font-bold text-mtg-deep">MTG Admin</span>
            </Link>
          </div>

          <ScrollArea className="h-[calc(100vh-4rem)] py-4">
            <nav className="px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-4" />

            <div className="px-3">
              <Link
                href="/admin/configuracion"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith('/admin/configuracion')
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                Configuración
              </Link>
            </div>
          </ScrollArea>

          {/* User section */}
          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-2">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-left">
                    <span className="text-sm font-medium">{user?.name || user?.email || 'Usuario'}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && isAuthenticated && (
        <div 
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && isAuthenticated && (
        <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r bg-card animate-in slide-in-from-left">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <Image 
                src="/elemento-mtg.png" 
                alt="MTG Automotora" 
                width={36} 
                height={36}
                className="h-9 w-auto object-contain"
              />
              <span className="text-xl font-bold text-mtg-deep">MTG Admin</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-4rem)] py-4">
            <nav className="px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-4" />

            <div className="px-3">
              <Link
                href="/admin/configuracion"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                Configuración
              </Link>
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* Main content */}
      <div className={cn(
        "min-h-screen",
        showSidebar ? "ml-64" : ""
      )}>
        {/* Global Site Header */}
        {isAuthenticated && <SiteHeader variant="admin" />}
        
        {/* Mobile header */}
        {isMobile && isAuthenticated && (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Image 
              src="/elemento-mtg.png" 
              alt="MTG Automotora" 
              width={32} 
              height={32}
              className="h-8 w-auto object-contain"
            />
            <span className="font-bold text-mtg-deep">MTG Admin</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {showMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
          <div className="flex h-16 items-center justify-around">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
