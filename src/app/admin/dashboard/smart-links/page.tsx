'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import SmartLinkActionsMenu from '@/components/smart-link/SmartLinkActionsMenu';
import type { SmartLink } from '@/lib/smart-link-types';

type ProjectOption = { _id: string; name: string };

export default function SmartLinksPage() {
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [move, setMove] = useState<{ link: SmartLink; projectId: string; projectName: string } | null>(
    null
  );
  const router = useRouter();

  const load = async () => {
    const [linksRes, projectsRes] = await Promise.all([
      fetch('/api/smart-links'),
      fetch('/api/projects'),
    ]);
    const data = await linksRes.json();
    const projectData = await projectsRes.json();
    setLinks(Array.isArray(data) ? data : []);
    setProjects(Array.isArray(projectData) ? projectData : []);
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

  const confirmMove = async () => {
    if (!move?.link._id) return;
    const res = await fetch(`/api/smart-links/${move.link._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: move.projectId }),
    });
    setMove(null);
    if (res.ok) load();
  };

  return (
    <div className="p-8 max-md:overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Links</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign each Smart Link to one project. Changing the project moves it out of the previous one.
          </p>
        </div>
        <Link
          href="/admin/dashboard/smart-links/new"
          className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium max-md:text-center"
        >
          Create Smart Link
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-md:overflow-x-auto">
        <table className="w-full text-sm max-md:min-w-[36rem]">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Smart Link Title</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Project</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Owner</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap max-md:text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No smart links yet.
                </td>
              </tr>
            )}
            {links.map((link) => (
              <tr key={link._id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900 max-md:whitespace-nowrap">{link.title}</td>
                <td className="px-4 py-3">
                  <select
                    value={link.projectId || ''}
                    onChange={(e) => {
                      const projectId = e.target.value;
                      if (!projectId || projectId === link.projectId) return;
                      const projectName = projects.find((item) => item._id === projectId)?.name || 'the selected project';
                      setMove({ link, projectId, projectName });
                    }}
                    className="max-w-[180px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 max-md:!max-w-[180px] max-md:w-[180px]"
                  >
                    <option value="" disabled>
                      Select project
                    </option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </td>
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
      <ConfirmDialog
        isOpen={Boolean(move)}
        title="Move Smart Link"
        message={`This Smart Link will be removed from ${move?.link.projectName || 'its current project'} and assigned to ${move?.projectName}. It will only appear in that project’s admin.`}
        confirmText="Move"
        onConfirm={confirmMove}
        onCancel={() => setMove(null)}
        variant="warning"
      />
    </div>
  );
}
