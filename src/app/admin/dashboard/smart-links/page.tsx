'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { SmartLink } from '@/lib/smart-link-types';

export default function SmartLinksPage() {
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    const res = await fetch('/api/smart-links');
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
  }, []);

  const shareUrl = (slug: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${slug}`;

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(shareUrl(slug));
    alert('Link copied');
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/smart-links/${id}/duplicate`, { method: 'POST' });
    if (res.ok) {
      const created = await res.json();
      router.push(`/admin/dashboard/smart-links/${created._id}/edit`);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    await fetch(`/api/smart-links/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Links</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage LinkedIn Smart Links</p>
        </div>
        <Link
          href="/admin/dashboard/smart-links/new"
          className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium"
        >
          Create Smart Link
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Smart Link Title</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No smart links yet.
                </td>
              </tr>
            )}
            {links.map((link) => (
              <tr key={link._id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{link.title}</td>
                <td className="px-4 py-3 text-gray-600">{link.owner}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      link.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {link.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="text-xs font-semibold text-[#120C29] underline" href={`/admin/dashboard/smart-links/${link._id}`}>
                      View
                    </Link>
                    <Link className="text-xs font-semibold text-[#120C29] underline" href={`/admin/dashboard/smart-links/${link._id}/edit`}>
                      Edit
                    </Link>
                    <button className="text-xs font-semibold text-[#120C29] underline" type="button" onClick={() => duplicate(link._id!)}>
                      Duplicate
                    </button>
                    <button className="text-xs font-semibold text-red-700 underline" type="button" onClick={() => setDeleteId(link._id!)}>
                      Delete
                    </button>
                    <a className="text-xs font-semibold text-[#120C29] underline" href={shareUrl(link.slug)} target="_blank" rel="noreferrer">
                      Share
                    </a>
                    <button className="text-xs font-semibold text-[#120C29] underline" type="button" onClick={() => copyLink(link.slug)}>
                      Copy Link
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Smart Link"
        message="Are you sure you want to delete this smart link?"
        confirmText="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  );
}
