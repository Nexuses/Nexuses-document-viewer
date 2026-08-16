import { notFound } from 'next/navigation';
import { getSmartLinkBySlug } from '@/lib/smart-links';
import SmartLinkViewer from '@/components/smart-link/SmartLinkViewer';
import ViewerErrorBoundary from '@/components/smart-link/ViewerErrorBoundary';

export default async function SmartLinkViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await getSmartLinkBySlug(slug);
  if (!link) notFound();

  const payload = JSON.parse(JSON.stringify(link));

  return (
    <ViewerErrorBoundary>
      <SmartLinkViewer link={payload} />
    </ViewerErrorBoundary>
  );
}
