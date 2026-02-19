// ============================================================
// Public Layout - MTG Automotora
// Layout for all public pages with Site Header
// ============================================================

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader variant="public" />
      <main className="min-h-screen">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
