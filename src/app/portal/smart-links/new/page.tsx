'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SmartLinkForm from '@/components/admin/SmartLinkForm';
import type { SmartLink } from '@/lib/smart-link-types';

export default function PortalNewSmartLinkPage() {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<SmartLink | undefined>();

  useEffect(() => {
    fetch('/api/auth/project-check')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.logoUrl) {
          setInitial({ companyLogo: data.user.logoUrl } as SmartLink);
        }
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <div className="p-8">
      <Link href="/portal/smart-links" className="text-sm text-gray-500 hover:text-gray-800">
        ← Smart Links
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">Create Smart Link</h1>
      {ready ? (
        <SmartLinkForm initial={initial} listPath="/portal/smart-links" />
      ) : (
        <p className="text-sm text-gray-500">Loading…</p>
      )}
    </div>
  );
}
