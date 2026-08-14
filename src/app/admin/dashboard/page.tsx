'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalSmartLinks: number;
  totalDocuments: number;
  totalViews: number;
  leads: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/smart-links/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() =>
        setStats({ totalSmartLinks: 0, totalDocuments: 0, totalViews: 0, leads: 0 })
      );
  }, []);

  const cards = [
    { label: 'Total Smart Links', value: stats?.totalSmartLinks ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Total Documents', value: stats?.totalDocuments ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Total Views', value: stats?.totalViews ?? '—', href: '/admin/dashboard/smart-links' },
    { label: 'Leads', value: stats?.leads ?? '—', href: '/admin/dashboard/submissions' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">LinkedIn Smart Links overview</p>
        </div>
        <Link
          href="/admin/dashboard/smart-links/new"
          className="px-4 py-2.5 bg-[#120C29] text-white rounded-lg text-sm font-medium hover:bg-[#0f0a23]"
        >
          Create Smart Link
        </Link>
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
    </div>
  );
}
