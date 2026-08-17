'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { SmartLink } from '@/lib/smart-link-types';

export default function ViewSmartLinkPage() {
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
    <div className="p-8 max-w-3xl">
      <Link href="/admin/dashboard/smart-links" className="text-sm text-gray-500 hover:text-gray-800">
        ← Smart Links
      </Link>
      <div className="bg-white rounded-2xl border border-gray-200 mt-4 overflow-hidden">
        {link.coverImage && (
          <img src={link.coverImage} alt="" className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            {link.companyLogo && (
              <img src={link.companyLogo} alt="" className="h-10 w-10 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{link.title}</h1>
              <p className="text-sm text-gray-500">
                {link.projectName ? `${link.projectName} · ` : ''}
                {link.owner} · {link.status} · {link.views} views
              </p>
            </div>
          </div>
          {link.description && <p className="text-gray-700 mb-6">{link.description}</p>}
          <div className="space-y-3">
            {(link.content || []).map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                {item.type === 'pdf' && (
                  <p className="font-medium text-gray-900">
                    {item.fileName || 'PDF'} — PDF, {item.pageCount ?? 0} pages
                  </p>
                )}
                {item.type === 'ppt' && (
                  <p className="font-medium text-gray-900">
                    {item.fileName || 'Deck'} — PowerPoint presentation
                    {item.slideCount ? `, ${item.slideCount} slides` : ''}
                  </p>
                )}
                {item.type !== 'pdf' && item.type !== 'ppt' && (
                  <p className="font-medium text-gray-900 capitalize">{item.type.replace('_', ' ')}</p>
                )}
                {item.url && (
                  <a href={item.url} className="text-sm text-blue-700 underline" target="_blank">
                    {item.url}
                  </a>
                )}
                {item.fileUrl && (
                  <a href={item.fileUrl} className="text-sm text-blue-700 underline block" target="_blank">
                    Open file
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
