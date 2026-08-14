'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SmartLinkForm from '@/components/admin/SmartLinkForm';
import type { SmartLink } from '@/lib/smart-link-types';

export default function EditSmartLinkPage() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<SmartLink | null>(null);

  useEffect(() => {
    fetch(`/api/smart-links/${id}`)
      .then((r) => r.json())
      .then(setLink);
  }, [id]);

  if (!link?._id) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-8">
      <Link href="/admin/dashboard/smart-links" className="text-sm text-gray-500 hover:text-gray-800">
        ← Smart Links
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">Edit Smart Link</h1>
      <SmartLinkForm initial={link} />
    </div>
  );
}
