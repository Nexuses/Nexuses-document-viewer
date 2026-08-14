'use client';

import Link from 'next/link';
import SmartLinkForm from '@/components/admin/SmartLinkForm';

export default function NewSmartLinkPage() {
  return (
    <div className="p-8">
      <Link href="/admin/dashboard/smart-links" className="text-sm text-gray-500 hover:text-gray-800">
        ← Smart Links
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">Create Smart Link</h1>
      <SmartLinkForm />
    </div>
  );
}
