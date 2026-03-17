'use client';

import dynamic from 'next/dynamic';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

const AppSidebar = dynamic(
  () => import('@/components/app-sidebar').then((m) => m.AppSidebar),
  {
    ssr: false,
  },
);

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
