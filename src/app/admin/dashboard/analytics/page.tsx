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

function locationLabel(session: Pick<UserSession, 'city' | 'region' | 'country' | 'countryCode'>) {
  const parts = [session.city, session.region, session.country || session.countryCode].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

export default function AnalyticsPage() {
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
        <p className="text-sm text-gray-500 mt-1">
          Visitor locations, time spent, smart link engagement, and content performance
        </p>
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
            <div className="space-y-4">
              {userSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
                  No sessions recorded yet.
                </div>
              ) : (
                userSessions.map((session) => (
                  <div key={session.sessionId} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-md:overflow-hidden max-md:min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                      <div className="min-w-0 max-md:w-full">
                        <h3 className="text-lg font-semibold text-gray-900 max-md:break-all">
                          {session.email || `Session ${session.sessionId.slice(0, 12)}...`}
                        </h3>
                        {session.smartLinkTitle && (
                          <p className="text-sm text-gray-600 mt-1 max-md:break-words">Smart Link: {session.smartLinkTitle}</p>
                        )}
                        <div className="mt-3 space-y-1 text-sm text-gray-600">
                          <p className="max-md:break-words"><span className="font-medium text-gray-800">Location:</span> {locationLabel(session)}</p>
                          <p className="max-md:break-all"><span className="font-medium text-gray-800">IP:</span> {session.ipAddress}</p>
                          <p className="max-md:break-words"><span className="font-medium text-gray-800">Started:</span> {formatDate(session.startTime)}</p>
                          {session.endTime && (
                            <p className="max-md:break-words"><span className="font-medium text-gray-800">Ended:</span> {formatDate(session.endTime)}</p>
                          )}
                          <p><span className="font-medium text-gray-800">Time Spent:</span> {formatTime(session.totalTimeSpent)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteDialog({ isOpen: true, sessionId: session.sessionId })}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-md:min-w-0">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2">Pages Viewed ({session.pagesVisited.length})</h4>
                        <div className="space-y-2">
                          {session.pagesVisited.map((page, index) => (
                            <div key={`${page.assetId}-${index}`} className="text-sm bg-gray-50 rounded-lg p-3 max-md:min-w-0 max-md:overflow-hidden">
                              <p className="font-medium text-gray-900 max-md:break-all">{page.assetTitle}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(page.timestamp)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2">Downloads ({session.downloads.length})</h4>
                        <div className="space-y-2">
                          {session.downloads.length === 0 ? (
                            <p className="text-sm text-gray-500">No downloads</p>
                          ) : (
                            session.downloads.map((download, index) => (
                              <div key={`${download.assetId}-${index}`} className="text-sm bg-gray-50 rounded-lg p-3 max-md:min-w-0 max-md:overflow-hidden">
                                <p className="font-medium text-gray-900 max-md:break-all">{download.assetTitle}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(download.timestamp)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
