'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AnalyticsSummary {
  totalSessions: number;
  totalPageViews: number;
  totalDownloads: number;
  totalTimeSpent: number;
  totalLeads: number;
  totalSmartLinkViews: number;
  uniqueCountries: number;
  averageSessionTime: number;
  viewsByCountry: {
    country: string;
    countryCode?: string;
    sessions: number;
    pageViews: number;
    totalTimeSpent: number;
    averageTimeSpent: number;
  }[];
  mostViewedAssets: { assetId: string; assetTitle: string; views: number }[];
  mostDownloadedAssets: { assetId: string; assetTitle: string; downloads: number }[];
  mostViewedSmartLinks: { smartLinkId: string; smartLinkTitle: string; views: number }[];
}

interface UserSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  email?: string;
  companyName?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  smartLinkTitle?: string;
  smartLinkSlug?: string;
  startTime: string;
  endTime?: string;
  totalTimeSpent: number;
  pagesVisited: { assetId: string; assetTitle: string; timestamp: string }[];
  downloads: { assetId: string; assetTitle: string; timestamp: string }[];
}

type Tab = 'overview' | 'countries' | 'sessions' | 'content';

function formatTime(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatDate(dateString: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function formatShortDate(dateString: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function locationLabel(session: Pick<UserSession, 'city' | 'region' | 'country' | 'countryCode'>) {
  const parts = [session.city, session.region, session.country || session.countryCode].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

function displayAssetTitle(title: string) {
  if (!title) return 'Untitled';
  const cleaned = title
    .replace(/__\d+__[a-z0-9]+\./i, '.')
    .replace(/_/g, ' ')
    .trim();
  return cleaned || title;
}

function sessionInitial(session: UserSession) {
  const source = session.email || session.smartLinkTitle || 'S';
  return source.charAt(0).toUpperCase();
}

function IconPin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconClock({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

function IconGlobe({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16" />
    </svg>
  );
}

function IconDoc({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function IconDownload({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  );
}

interface Props {
  description?: string;
}

export default function AnalyticsDashboard({
  description = 'Visitor locations, time spent, smart link engagement, and content performance',
}: Props) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; sessionId: string | null }>({
    isOpen: false,
    sessionId: null,
  });

  const fetchAnalytics = async () => {
    try {
      const [summaryResponse, sessionsResponse] = await Promise.all([
        fetch('/api/analytics?summary=true'),
        fetch('/api/analytics?sessions=true'),
      ]);

      if (summaryResponse.ok) setSummary(await summaryResponse.json());
      if (sessionsResponse.ok) setUserSessions(await sessionsResponse.json());
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.sessionId) return;
    try {
      const response = await fetch(`/api/analytics?sessionId=${encodeURIComponent(deleteDialog.sessionId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUserSessions((prev) => prev.filter((session) => session.sessionId !== deleteDialog.sessionId));
        await fetchAnalytics();
      }
    } finally {
      setDeleteDialog({ isOpen: false, sessionId: null });
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'countries', label: 'Countries' },
    { id: 'sessions', label: `Sessions (${userSessions.length})` },
    { id: 'content', label: 'Content' },
  ];

  return (
    <div className="p-8 max-md:overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-6 max-md:gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 border-b-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-[#120C29] text-[#120C29]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">Loading analytics...</div>
      ) : !summary ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">No analytics data yet.</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Sessions', value: summary.totalSessions },
                  { label: 'Page Views', value: summary.totalPageViews },
                  { label: 'Leads', value: summary.totalLeads },
                  { label: 'Countries', value: summary.uniqueCountries },
                  { label: 'Smart Link Opens', value: summary.totalSmartLinkViews },
                  { label: 'Downloads', value: summary.totalDownloads },
                  { label: 'Total Time', value: formatTime(summary.totalTimeSpent) },
                  { label: 'Avg Session Time', value: formatTime(summary.averageSessionTime) },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Top Countries</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-6 py-3 font-medium">Country</th>
                        <th className="px-6 py-3 font-medium">Sessions</th>
                        <th className="px-6 py-3 font-medium">Page Views</th>
                        <th className="px-6 py-3 font-medium">Total Time</th>
                        <th className="px-6 py-3 font-medium">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.viewsByCountry.slice(0, 8).map((row) => (
                        <tr key={`${row.country}-${row.countryCode || 'na'}`} className="border-t border-gray-100">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {row.countryCode ? `${row.country} (${row.countryCode})` : row.country}
                          </td>
                          <td className="px-6 py-3 text-gray-700">{row.sessions}</td>
                          <td className="px-6 py-3 text-gray-700">{row.pageViews}</td>
                          <td className="px-6 py-3 text-gray-700">{formatTime(row.totalTimeSpent)}</td>
                          <td className="px-6 py-3 text-gray-700">{formatTime(row.averageTimeSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'countries' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-6 py-3 font-medium">Country</th>
                      <th className="px-6 py-3 font-medium">Sessions</th>
                      <th className="px-6 py-3 font-medium">Page Views</th>
                      <th className="px-6 py-3 font-medium">Total Time Spent</th>
                      <th className="px-6 py-3 font-medium">Avg Time / Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.viewsByCountry.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          No location data recorded yet.
                        </td>
                      </tr>
                    ) : (
                      summary.viewsByCountry.map((row) => (
                        <tr key={`${row.country}-${row.countryCode || 'na'}`} className="border-t border-gray-100">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {row.countryCode ? `${row.country} (${row.countryCode})` : row.country}
                          </td>
                          <td className="px-6 py-3 text-gray-700">{row.sessions}</td>
                          <td className="px-6 py-3 text-gray-700">{row.pageViews}</td>
                          <td className="px-6 py-3 text-gray-700">{formatTime(row.totalTimeSpent)}</td>
                          <td className="px-6 py-3 text-gray-700">{formatTime(row.averageTimeSpent)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {userSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#120C29]/5 text-[#120C29]">
                    <IconClock className="h-6 w-6" />
                  </div>
                  <p className="text-base font-semibold text-gray-900">No sessions yet</p>
                  <p className="mt-1 text-sm text-gray-500">Visitor sessions will appear here once people open your Smart Links.</p>
                </div>
              ) : (
                userSessions.map((session) => (
                  <article
                    key={session.sessionId}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)] max-md:min-w-0"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-[#120C29]" aria-hidden="true" />

                    <div className="pl-5 max-md:pl-4">
                      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 max-md:px-4">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div className="relative shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#120C29] text-base font-semibold text-white shadow-sm">
                              {sessionInitial(session)}
                            </div>
                            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" title="Recorded session" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[17px] font-semibold tracking-tight text-gray-900 max-md:break-all">
                                {session.email || 'Anonymous visitor'}
                              </h3>
                              {!session.endTime && (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                  Live
                                </span>
                              )}
                            </div>
                            {session.smartLinkTitle ? (
                              <p className="mt-1 text-sm text-gray-500 max-md:break-words">
                                Viewed <span className="font-medium text-gray-700">{session.smartLinkTitle}</span>
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-gray-500">Smart Link session</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Time spent</span>
                            <span className="text-lg font-semibold tabular-nums text-[#120C29]">
                              {formatTime(session.totalTimeSpent)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteDialog({ isOpen: true, sessionId: session.sessionId })}
                            className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mx-5 mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 sm:grid-cols-4 max-md:mx-4">
                        {[
                          {
                            icon: <IconPin className="h-3.5 w-3.5" />,
                            label: 'Location',
                            value: locationLabel(session),
                          },
                          {
                            icon: <IconGlobe className="h-3.5 w-3.5" />,
                            label: 'IP',
                            value: session.ipAddress,
                          },
                          {
                            icon: <IconClock className="h-3.5 w-3.5" />,
                            label: 'Started',
                            value: formatShortDate(session.startTime),
                          },
                          {
                            icon: <IconClock className="h-3.5 w-3.5" />,
                            label: 'Ended',
                            value: session.endTime ? formatShortDate(session.endTime) : 'In progress',
                          },
                        ].map((item) => (
                          <div key={item.label} className="bg-white px-4 py-3.5 min-w-0">
                            <div className="mb-1.5 flex items-center gap-1.5 text-gray-400">
                              {item.icon}
                              <span className="text-[11px] font-medium uppercase tracking-wide">{item.label}</span>
                            </div>
                            <p className="truncate text-sm font-semibold text-gray-900" title={item.value}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-4 px-5 pb-5 lg:grid-cols-2 max-md:px-4 max-md:min-w-0">
                        <section className="min-w-0 rounded-xl border border-gray-100 bg-[#FAFBFC]">
                          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-900">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#120C29]/10 text-[#120C29]">
                                <IconDoc className="h-3.5 w-3.5" />
                              </span>
                              <h4 className="text-sm font-semibold">Pages viewed</h4>
                            </div>
                            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                              {session.pagesVisited.length}
                            </span>
                          </div>
                          <div className="max-h-72 overflow-y-auto px-3 py-3">
                            {session.pagesVisited.length === 0 ? (
                              <p className="px-1 py-8 text-center text-sm text-gray-400">No pages viewed</p>
                            ) : (
                              <ol className="relative space-y-0 pl-2">
                                {session.pagesVisited.map((page, index) => (
                                  <li key={`${page.assetId}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                                    {index < session.pagesVisited.length - 1 && (
                                      <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" aria-hidden="true" />
                                    )}
                                    <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#120C29] ring-2 ring-[#120C29]/15">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-100 transition-colors hover:ring-gray-200">
                                      <p className="truncate text-sm font-medium text-gray-900" title={page.assetTitle}>
                                        {displayAssetTitle(page.assetTitle)}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-500">{formatDate(page.timestamp)}</p>
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </section>

                        <section className="min-w-0 rounded-xl border border-gray-100 bg-[#FAFBFC]">
                          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-900">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <IconDownload className="h-3.5 w-3.5" />
                              </span>
                              <h4 className="text-sm font-semibold">Downloads</h4>
                            </div>
                            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                              {session.downloads.length}
                            </span>
                          </div>
                          <div className="max-h-72 overflow-y-auto px-3 py-3">
                            {session.downloads.length === 0 ? (
                              <div className="mx-1 my-4 rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-10 text-center">
                                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                                  <IconDownload className="h-4 w-4" />
                                </div>
                                <p className="text-sm text-gray-400">No downloads in this session</p>
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {session.downloads.map((download, index) => (
                                  <li
                                    key={`${download.assetId}-${index}`}
                                    className="flex items-start gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-100 transition-colors hover:ring-emerald-100"
                                  >
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                      <IconDownload className="h-3 w-3" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-gray-900" title={download.assetTitle}>
                                        {displayAssetTitle(download.assetTitle)}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-500">{formatDate(download.timestamp)}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </section>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Most Viewed Smart Links</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {summary.mostViewedSmartLinks.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">No smart link views yet.</p>
                  ) : (
                    summary.mostViewedSmartLinks.map((link, index) => (
                      <div key={link.smartLinkId} className="px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 max-md:break-words">#{index + 1} {link.smartLinkTitle}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 shrink-0">{link.views} opens</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Most Viewed Assets</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {summary.mostViewedAssets.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">No asset views yet.</p>
                  ) : (
                    summary.mostViewedAssets.map((asset, index) => (
                      <div key={asset.assetId} className="px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                        <p className="font-medium text-gray-900 min-w-0 max-md:break-all">#{index + 1} {asset.assetTitle}</p>
                        <p className="text-sm font-semibold text-gray-700 shrink-0">{asset.views} views</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden xl:col-span-2">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Most Downloaded Assets</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {summary.mostDownloadedAssets.length === 0 ? (
                    <p className="px-6 py-8 text-sm text-gray-500">No downloads yet.</p>
                  ) : (
                    summary.mostDownloadedAssets.map((asset, index) => (
                      <div key={asset.assetId} className="px-6 py-4 flex items-center justify-between gap-3 min-w-0">
                        <p className="font-medium text-gray-900 min-w-0 max-md:break-all">#{index + 1} {asset.assetTitle}</p>
                        <p className="text-sm font-semibold text-gray-700 shrink-0">{asset.downloads} downloads</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, sessionId: null })}
        variant="danger"
      />
    </div>
  );
}
