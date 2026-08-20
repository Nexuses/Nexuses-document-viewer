'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { SmartLink } from '@/lib/smart-link-types';
import SmartLinkViewer from '@/components/smart-link/SmartLinkViewer';
import ViewerErrorBoundary from '@/components/smart-link/ViewerErrorBoundary';

function displayName(owner?: string) {
  if (!owner) return 'Nexuses';
  if (!owner.includes('@')) return owner;
  return owner
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'N';
}

export default function PublicSmartLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<SmartLink | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    fetch(`/api/smart-links/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) {
          setMissing(true);
          return;
        }
        setLink(await r.json());
      })
      .catch(() => setMissing(true));
  }, [slug]);

  const ownerName = useMemo(() => displayName(link?.owner), [link?.owner]);
  const canSubmit = name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleAgree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !link) return;
    setShowViewer(true);
    const sessionId = window.localStorage.getItem('smart-link-session') || crypto.randomUUID();
    window.localStorage.setItem('smart-link-session', sessionId);
    void fetch('/api/form-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        sessionId,
        smartLinkId: link._id,
        smartLinkSlug: link.slug,
        smartLinkTitle: link.title,
      }),
    });
    void fetch(`/api/smart-links/public/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
  };

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#1f3d4d' }}>
        This smart link is unavailable.
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f3d4d', color: '#cfe3ea' }}>
        Loading...
      </div>
    );
  }

  if (showViewer) {
    return (
      <ViewerErrorBoundary>
        <SmartLinkViewer link={link} />
      </ViewerErrorBoundary>
    );
  }

  return (
    <div
      className="min-h-screen flex justify-center items-start py-8 px-4 overflow-y-auto"
      style={{ background: '#1f3d4d', fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="w-full max-w-[560px] my-auto bg-white shadow-xl flex flex-col">
        <div className="relative z-10 h-[168px]" style={{ background: '#c5d3dc' }}>
          <div className="absolute inset-0 overflow-hidden">
            {link.coverImage ? (
              <img src={link.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-20">
            {link.companyLogo ? (
              <div className="bg-white rounded-xl px-4 py-3 shadow-md border border-white">
                <img src={link.companyLogo} alt="" className="h-16 max-w-[180px] object-contain" />
              </div>
            ) : (
              <div className="h-16 px-5 rounded-xl border border-white bg-[#2f5d73] text-white flex items-center justify-center text-2xl font-semibold shadow-md">
                {initials(ownerName)}
              </div>
            )}
          </div>
        </div>
        <div className="pt-16 px-8 pb-10 text-center max-md:px-4 max-md:pb-8">
          <p className="text-[15px]" style={{ color: '#8a9aa3' }}>
            {ownerName} shared the following content
          </p>
          <h1 className="mt-3 text-[28px] leading-tight font-bold max-md:text-[22px]" style={{ color: '#1d3b4d' }}>
            {link.title}
          </h1>
          {link.description && (
            <p className="mt-2 text-sm" style={{ color: '#6b7c86' }}>
              {link.description}
            </p>
          )}
          <form onSubmit={handleAgree} className="mt-8 text-left mx-auto max-w-[420px] rounded-md px-6 py-6" style={{ border: '1px solid #d8dee3', background: '#f7f8f9' }}>
            <label className="block text-[13px] mb-1.5" style={{ color: '#3d4f59' }}>
              Full Name *
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full h-10 px-3 mb-4 bg-white outline-none" style={{ border: '1px solid #3d4f59', color: '#1d3b4d' }} />
            <label className="block text-[13px] mb-1.5" style={{ color: '#3d4f59' }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-10 px-3 mb-4 bg-white outline-none" style={{ border: '1px solid #cfd6db', color: '#1d3b4d' }} />
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-md text-white text-[16px] font-medium"
              style={{ background: canSubmit ? '#4eb3d3' : '#b7dcea' }}
            >
              Agree and view
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
