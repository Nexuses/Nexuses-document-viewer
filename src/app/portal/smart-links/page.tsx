'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import SmartLinkActionsMenu from '@/components/smart-link/SmartLinkActionsMenu';
import type { SmartLink } from '@/lib/smart-link-types';

export default function PortalSmartLinksPage() {
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [projectName, setProjectName] = useState('your project');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    const [linksRes, authRes] = await Promise.all([
      fetch('/api/smart-links'),
      fetch('/api/auth/project-check'),
    ]);
    const data = await linksRes.json();
    setLinks(Array.isArray(data) ? data : []);
    if (authRes.ok) {
      const auth = await authRes.json();
      if (auth.user?.projectName) setProjectName(auth.user.projectName);
    }
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
      router.push(`/portal/smart-links/${created._id}/edit`);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    await fetch(`/api/smart-links/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  return (
    <div className="p-8 max-md:overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Links</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage Smart Links for <span className="font-medium text-gray-700">{projectName}</span>
          </p>
        </div>
        <Link
          href="/portal/smart-links/new"
          className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium max-md:text-center"
        >
          Create Smart Link
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-md:overflow-x-auto">
        <table className="w-full text-sm max-md:min-w-[32rem]">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Smart Link Title</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Owner</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap max-md:text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No smart links for this project yet.
                </td>
              </tr>
            )}
            {links.map((link) => (
              <tr key={link._id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900 max-md:whitespace-nowrap">{link.title}</td>
                <td className="px-4 py-3 text-gray-600 max-md:whitespace-nowrap">{link.owner}</td>
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
                <td className="px-4 py-3 max-md:whitespace-nowrap max-md:text-center">
                  <SmartLinkActionsMenu
                    slug={link.slug}
                    linkId={link._id!}
                    onDuplicate={duplicate}
                    onDelete={setDeleteId}
                    onCopyLink={copyLink}
                  />
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
