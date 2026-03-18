import { CreateWorkflowView } from '@/features/workflows/views/create-workflow-view';
import { isAuthenticated } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export default async function NewWorkflowPage() {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  return <CreateWorkflowView />;
}
