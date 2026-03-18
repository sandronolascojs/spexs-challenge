import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-screen min-h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-screen max-h-screen overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
