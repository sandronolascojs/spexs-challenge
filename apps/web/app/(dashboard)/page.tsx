import { redirect } from 'next/navigation';

import DashboardView from '@/features/dashboard/views/dashboard-view';
import { isAuthenticated } from '@/lib/auth/guards';

export default async function DashboardPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) redirect('/login');

  return <DashboardView />;
}
