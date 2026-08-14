'use client';

import { useState, useEffect } from 'react';

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function ShareButton({ shareUrl }: { shareUrl?: string }) {
  const [status, setStatus] = useState<string>('');

  const getShareUrl = () => {
    if (shareUrl) return shareUrl;
    return typeof window !== 'undefined' ? window.location.href : '';
  };

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const handleClick = async () => {
    try {
      const url = getShareUrl();
      await copyToClipboard(url);
      setStatus('Link copied to clipboard');
    } catch {
      setStatus('Failed to copy');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        title="Copy URL"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7.5 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm13.5-6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm0 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM7.4 11.1l9.2-4.6M7.4 12.9l9.2 4.6"
          />
        </svg>
      </button>
      {status && (
        <div className="fixed top-4 right-4 z-[9999] pointer-events-none animate-slide-down">
          <div className={`px-5 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] text-white font-medium text-sm min-w-[240px] max-w-[320px] text-center backdrop-blur-md ${
            status.includes('Failed') 
              ? 'bg-gradient-to-br from-red-500 to-red-600 border border-red-400/50' 
              : 'bg-gradient-to-br from-emerald-500 to-green-600 border border-emerald-400/50'
          }`}>
            <div className="flex items-center justify-center gap-3">
              {!status.includes('Failed') ? (
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <span className="leading-tight">{status}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


