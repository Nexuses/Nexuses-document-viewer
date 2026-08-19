'use client';

import { useEffect, useState } from 'react';

interface Lead {
  _id: string;
  email?: string;
  name?: string;
  smartLinkTitle?: string;
  createdAt?: string;
}

export default function PortalLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/form-submissions')
      .then((r) => r.json())
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-md:overflow-x-hidden">
      <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Form submissions from this project’s Smart Links</p>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-md:overflow-x-auto">
        <table className="w-full text-sm max-md:min-w-[40rem]">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Date</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Name</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Email</th>
              <th className="px-4 py-3 font-medium max-md:whitespace-nowrap">Smart Link</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No leads for this project yet.
                </td>
              </tr>
            )}
            {!loading &&
              leads.map((lead) => (
                <tr key={lead._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-md:whitespace-nowrap">{lead.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{lead.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 max-md:whitespace-nowrap">{lead.smartLinkTitle || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
