'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';

interface FormSubmission {
  _id: string;
  email?: string;
  name?: string;
  companyEmail?: string;
  firstName?: string;
  lastName?: string;
  smartLinkTitle?: string;
  createdAt?: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; submissionId: string | null }>({
    isOpen: false,
    submissionId: null,
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
        fetchSubmissions();
      } else {
        router.push('/admin/login');
      }
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/form-submissions');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ isOpen: true, submissionId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.submissionId) return;

    try {
      const response = await fetch(`/api/form-submissions?id=${encodeURIComponent(deleteDialog.submissionId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubmissions(submissions.filter(submission => submission._id !== deleteDialog.submissionId));
        setDeleteDialog({ isOpen: false, submissionId: null });
      } else {
        alert('Failed to delete submission. Please try again.');
        setDeleteDialog({ isOpen: false, submissionId: null });
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
      alert('An error occurred while deleting the submission.');
      setDeleteDialog({ isOpen: false, submissionId: null });
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
        <div className="flex justify-between items-center mb-6 max-md:flex-col max-md:items-stretch max-md:gap-3">
          <h1 className="text-3xl font-bold text-gray-900 max-md:text-2xl">Form Submissions</h1>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 max-md:text-center"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">No form submissions yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Smart Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(submission.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.name || `${submission.firstName || ''} ${submission.lastName || ''}`.trim() || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.email || submission.companyEmail || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.smartLinkTitle || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteClick(submission._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Delete this submission"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Total Submissions: <span className="font-semibold">{submissions.length}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Submission"
        message="Are you sure you want to delete this form submission? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, submissionId: null })}
        variant="danger"
      />
    </div>
  );
}

