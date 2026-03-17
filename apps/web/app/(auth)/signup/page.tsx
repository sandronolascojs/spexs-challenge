import { redirect } from 'next/navigation';

import SignupView from '@/features/auth/views/signup-view';
import { isAuthenticated } from '@/lib/auth/guards';

export default async function SignupPage() {
  const isAuth = await isAuthenticated();
  if (isAuth) return redirect('/');

  return <SignupView />;
}
