'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ContactFormModalProps {
  onClose: () => void;
  onSubmit: () => void;
  sessionId?: string;
}

interface FormData {
  name: string;
  email: string;
}

export default function ContactFormModal({ onClose, onSubmit, sessionId }: ContactFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sessionId: sessionId || '',
        }),
      });

      if (response.ok) {
        onClose();
        onSubmit();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit form');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/5">
      <div className="bg-white rounded-lg shadow-xl border-2 border-purple-500 shadow-[0_0_0_2px_rgba(168,85,247,0.35),0_0_28px_rgba(168,85,247,0.55)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-8 max-md:p-5">
          {/* Mobile: Branding */}
          <div className="lg:hidden flex items-center justify-start mb-4">
            <Image
              src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png"
              alt="Nexuses Logo"
              width={180}
              height={54}
              className="object-contain"
              unoptimized
              priority
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 max-md:text-xl">
            Please Complete the Form to View the Document
          </h2>
          <p className="text-gray-600 mb-6">
            This document will be available after you complete this form.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name:*
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address:*
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Submitting...' : 'View the Document'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By clicking Submit, I agree to the use of my personal data in accordance with{' '}
              <a
                href="https://nexuses.in/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:underline"
              >
                Nexuses Privacy Policy
              </a>
              . Nexuses will not sell, trade, lease, or rent your personal data to third parties.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

