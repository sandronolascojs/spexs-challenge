import { workflowNewSearchParamsCache } from '@/features/workflows/lib/search-params';
import { CreateWorkflowView } from '@/features/workflows/views/create-workflow-view';
import { isAuthenticated } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewWorkflowPage({ searchParams }: PageProps) {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect('/login');

  // Parse server-side so nuqs SSR hydration works correctly
  workflowNewSearchParamsCache.parse(await searchParams);

  return <CreateWorkflowView />;
}
