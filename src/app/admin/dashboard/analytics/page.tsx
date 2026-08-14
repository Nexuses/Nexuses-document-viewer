'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AnalyticsSummary {
  totalSessions: number;
  totalPageViews: number;
  totalDownloads: number;
  totalTimeSpent: number;
  mostViewedAssets: { assetId: string; assetTitle: string; views: number }[];
  mostDownloadedAssets: { assetId: string; assetTitle: string; downloads: number }[];
  averageSessionTime: number;
}

interface UserSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  email?: string;
  companyName?: string;
  startTime: string;
  endTime?: string;
  totalTimeSpent: number;
  pagesVisited: { assetId: string; assetTitle: string; timestamp: string }[];
  downloads: { assetId: string; assetTitle: string; timestamp: string }[];
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'users'>('summary');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; sessionId: string | null }>({
    isOpen: false,
    sessionId: null,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      if (data.authenticated) {
        setAuthenticated(true);
        fetchAnalytics();
      } else {
        router.push('/admin/login');
      }
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [summaryResponse, sessionsResponse] = await Promise.all([
        fetch('/api/analytics?summary=true'),
        fetch('/api/analytics?sessions=true'),
      ]);
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setUserSessions(sessionsData);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteClick = (sessionId: string) => {
    setDeleteDialog({ isOpen: true, sessionId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.sessionId) return;

    try {
      const response = await fetch(`/api/analytics?sessionId=${encodeURIComponent(deleteDialog.sessionId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUserSessions(userSessions.filter(session => session.sessionId !== deleteDialog.sessionId));
        const summaryResponse = await fetch('/api/analytics?summary=true');
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        }
        setDeleteDialog({ isOpen: false, sessionId: null });
      } else {
        alert('Failed to delete session. Please try again.');
        setDeleteDialog({ isOpen: false, sessionId: null });
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('An error occurred while deleting the session.');
      setDeleteDialog({ isOpen: false, sessionId: null });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Sessions ({userSessions.length})
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            {userSessions.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <p className="text-gray-600">No user sessions recorded yet.</p>
              </div>
            ) : (
              userSessions.map((session) => (
                <div key={session.sessionId} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex flex-wrap items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex-1 min-w-[200px] mb-4 md:mb-0">
                      <div className="mb-3">
                        {session.email ? (
                          <h3 className="text-xl font-bold text-blue-600 mb-1">
                            {session.email}
                          </h3>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Session: {session.sessionId.substring(0, 20)}...
                          </h3>
                        )}
                        {session.companyName && (
                          <p className="text-base font-medium text-gray-700 mb-2">
                            Company: {session.companyName}
                          </p>
                        )}
                        {!session.email && (
                          <p className="text-sm text-gray-500 italic">
                            (No email - form not submitted)
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Session ID:</span> {session.sessionId.substring(0, 30)}...</p>
                        <p><span className="font-medium">IP Address:</span> {session.ipAddress}</p>
                        <p><span className="font-medium">Device:</span> {session.userAgent.substring(0, 80)}...</p>
                        <p><span className="font-medium">Start Time:</span> {formatDate(session.startTime)}</p>
                        {session.endTime && (
                          <p><span className="font-medium">End Time:</span> {formatDate(session.endTime)}</p>
                        )}
                        <p><span className="font-medium">Time Spent:</span> {formatTime(session.totalTimeSpent)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(session.sessionId)}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                      title="Delete this session"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pages Visited */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Pages Visited ({session.pagesVisited.length})
                      </h4>
                      {session.pagesVisited.length === 0 ? (
                        <p className="text-sm text-gray-500">No pages visited</p>
                      ) : (
                        <div className="space-y-2">
                          {session.pagesVisited.map((page, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                              <p className="font-medium text-gray-900">{page.assetTitle}</p>
                              <p className="text-xs text-gray-500">{formatDate(page.timestamp)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Downloads */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Downloads ({session.downloads.length})
                      </h4>
                      {session.downloads.length === 0 ? (
                        <p className="text-sm text-gray-500">No downloads</p>
                      ) : (
                        <div className="space-y-2">
                          {session.downloads.map((download, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                              <p className="font-medium text-gray-900">{download.assetTitle}</p>
                              <p className="text-xs text-gray-500">{formatDate(download.timestamp)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : !summary ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">No analytics data available yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sessions</h3>
                <p className="text-3xl font-bold text-gray-900">{summary.totalSessions}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Page Views</h3>
                <p className="text-3xl font-bold text-gray-900">{summary.totalPageViews}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Downloads</h3>
                <p className="text-3xl font-bold text-gray-900">{summary.totalDownloads}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Time Spent</h3>
                <p className="text-3xl font-bold text-gray-900">{formatTime(summary.totalTimeSpent)}</p>
              </div>
            </div>

            {/* Average Session Time */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Session Time</h3>
              <p className="text-2xl font-bold text-blue-600">{formatTime(summary.averageSessionTime)}</p>
            </div>

            {/* Most Viewed Assets */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Viewed Assets</h3>
              {summary.mostViewedAssets.length === 0 ? (
                <p className="text-gray-500">No views recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.mostViewedAssets.map((asset, index) => (
                        <tr key={asset.assetId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {asset.assetTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {asset.views}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Most Downloaded Assets */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Downloaded Assets</h3>
              {summary.mostDownloadedAssets.length === 0 ? (
                <p className="text-gray-500">No downloads recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Downloads
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.mostDownloadedAssets.map((asset, index) => (
                        <tr key={asset.assetId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {asset.assetTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {asset.downloads}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

