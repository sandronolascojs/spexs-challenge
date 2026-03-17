import { redirect } from 'next/navigation';

import LoginView from '@/features/auth/views/login-view';
import { isAuthenticated } from '@/lib/auth/guards';

export default async function LoginPage() {
  const isAuth = await isAuthenticated();
  if (isAuth) return redirect('/');

  return <LoginView />;
}
