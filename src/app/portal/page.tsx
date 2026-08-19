'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProjectAdminStats, SmartLink } from '@/lib/smart-link-types';

const EMPTY_STATS: ProjectAdminStats = {
  projectName: '',
  totalSmartLinks: 0,
  publishedLinks: 0,
  draftLinks: 0,
  totalDocuments: 0,
  totalViews: 0,
  leads: 0,
  users: 0,
};

export default function PortalDashboardPage() {
  const [stats, setStats] = useState<ProjectAdminStats | null>(null);
  const [links, setLinks] = useState<SmartLink[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/smart-links/stats').then((r) => r.json()),
      fetch('/api/smart-links').then((r) => r.json()),
    ])
      .then(([statsData, linksData]) => {
        setStats({ ...EMPTY_STATS, ...statsData });
        setLinks(Array.isArray(linksData) ? linksData.slice(0, 8) : []);
      })
      .catch(() => {
        setStats(EMPTY_STATS);
        setLinks([]);
      });
  }, []);

  const cards = [
    { label: 'Smart Links', value: stats?.totalSmartLinks ?? '—', href: '/portal/smart-links' },
    { label: 'Published', value: stats?.publishedLinks ?? '—', href: '/portal/smart-links' },
    { label: 'Drafts', value: stats?.draftLinks ?? '—', href: '/portal/smart-links' },
    { label: 'Leads', value: stats?.leads ?? '—', href: '/portal/leads' },
    { label: 'Documents', value: stats?.totalDocuments ?? '—', href: '/portal/smart-links' },
    { label: 'Total Views', value: stats?.totalViews ?? '—', href: '/portal/smart-links' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 max-md:flex-col max-md:items-stretch">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.projectName
              ? `Overview for ${stats.projectName}`
              : 'Project Admin overview'}
          </p>
        </div>
        <Link
          href="/portal/smart-links/new"
          className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium hover:bg-[#0f0a23] max-md:text-center"
        >
          Create Smart Link
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Smart Links</h2>
            <p className="text-sm text-gray-500 mt-0.5">Latest links generated for this project</p>
          </div>
          <Link href="/portal/smart-links" className="text-sm font-medium text-[#120C29] underline">
            View all
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                    No smart links yet.{' '}
                    <Link href="/portal/smart-links/new" className="font-medium text-[#120C29] underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              )}
              {links.map((link) => (
                <tr key={link._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{link.title}</td>
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
                  <td className="px-4 py-3 text-gray-700">{link.views ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
