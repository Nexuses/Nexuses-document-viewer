'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MasterAdminStats } from '@/lib/smart-link-types';

const EMPTY_STATS: MasterAdminStats = {
  totalProjects: 0,
  totalUsers: 0,
  totalSmartLinks: 0,
  publishedLinks: 0,
  draftLinks: 0,
  unassignedLinks: 0,
  totalDocuments: 0,
  totalViews: 0,
  leads: 0,
  projects: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<MasterAdminStats | null>(null);

  useEffect(() => {
    fetch('/api/smart-links/stats')
      .then((r) => r.json())
      .then((data) => setStats({ ...EMPTY_STATS, ...data, projects: data.projects || [] }))
      .catch(() => setStats(EMPTY_STATS));
  }, []);

  const cards = [
    { label: 'Projects', value: stats?.totalProjects ?? '—', href: '/admin/dashboard/projects' },
    { label: 'Project Users', value: stats?.totalUsers ?? '—', href: '/admin/dashboard/projects' },
    { label: 'Smart Links', value: stats?.totalSmartLinks ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Leads', value: stats?.leads ?? '—', href: '/admin/dashboard/submissions' },
    { label: 'Published', value: stats?.publishedLinks ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Drafts', value: stats?.draftLinks ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Documents', value: stats?.totalDocuments ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Total Views', value: stats?.totalViews ?? '—', href: '/admin/dashboard/analytics' },
  ];

  return (
    <div className="p-8 max-md:overflow-x-hidden">
      <div className="flex items-center justify-between mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Master Admin overview across all projects</p>
        </div>
        <div className="flex gap-2 max-md:flex-col">
          <Link
            href="/admin/dashboard/projects"
            className="px-4 py-2.5 border border-gray-300 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 max-md:w-full max-md:text-center"
          >
            Manage Projects
          </Link>
          <Link
            href="/admin/dashboard/smart-links/new"
            className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium hover:bg-[#0f0a23] max-md:w-full max-md:text-center"
          >
            Create Smart Link
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          </Link>
        ))}
      </div>

      {stats && stats.unassignedLinks > 0 && (
        <p className="text-sm text-amber-700 mt-4">
          {stats.unassignedLinks} smart link{stats.unassignedLinks === 1 ? '' : 's'} are not assigned to a project.
        </p>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <p className="text-sm text-gray-500 mt-0.5">Users, links, views, and leads for each project</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-md:overflow-x-auto">
          <table className="w-full text-sm max-md:min-w-[52rem]">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Project</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Users</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Smart Links</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Published</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Drafts</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Documents</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Views</th>
                <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Leads</th>
              </tr>
            </thead>
            <tbody>
              {!stats && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              )}
              {stats && stats.projects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No projects yet.{' '}
                    <Link href="/admin/dashboard/projects" className="font-medium text-[#120C29] underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              )}
              {stats?.projects.map((project) => (
                <tr key={project.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 max-md:whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {project.logoUrl ? (
                        <img
                          src={project.logoUrl}
                          alt=""
                          className="h-8 w-8 rounded object-contain bg-gray-50 border border-gray-100"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">/{project.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.users}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-md:whitespace-nowrap">{project.links}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.published}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.drafts}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.documents}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.views}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{project.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
