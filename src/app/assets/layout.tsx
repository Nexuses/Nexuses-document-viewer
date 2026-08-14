'use client';

import { useParams } from 'next/navigation';
import AssetViewerShell from '@/components/AssetViewerShell';

export default function AssetsLayout() {
  const params = useParams();
  const raw = (params as Record<string, unknown>)?.id;
  const activeAssetId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;

  return <AssetViewerShell activeAssetId={activeAssetId} />;
}


