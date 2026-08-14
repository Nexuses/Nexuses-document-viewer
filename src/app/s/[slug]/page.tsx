'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { SmartLink } from '@/lib/smart-link-types';

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
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleAgree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !link) return;
    setSubmitting(true);
    try {
      const sessionId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('smart-link-session') || crypto.randomUUID()
          : crypto.randomUUID();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('smart-link-session', sessionId);
      }

      await fetch('/api/form-submissions', {
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
      await fetch(`/api/smart-links/public/${slug}`, { method: 'POST' });
      setUnlocked(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f3d4d', color: '#fff' }}>
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

  return (
    <div
      className="min-h-screen flex justify-center items-start py-8 px-4 overflow-y-auto"
      style={{ background: '#1f3d4d', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}
    >
      <div className="w-full max-w-[560px] my-auto bg-white shadow-xl flex flex-col relative overflow-visible">
        <div className="relative z-10 h-[168px]" style={{ background: '#c5d3dc' }}>
          <div className="absolute inset-0 overflow-hidden">
            {link.coverImage ? (
              <img src={link.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 560 168" preserveAspectRatio="none" aria-hidden>
                <path fill="#b7c8d4" d="M0,120 C80,40 180,160 280,90 C380,20 460,140 560,70 L560,168 L0,168 Z" />
                <path fill="#a9bdc9" d="M0,148 C120,80 220,170 340,110 C460,50 520,150 560,120 L560,168 L0,168 Z" />
              </svg>
            )}
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-20">
            {link.companyLogo ? (
              <img
                src={link.companyLogo}
                alt=""
                className="h-24 w-24 rounded-full object-cover border-4 border-white bg-white shadow-md"
              />
            ) : (
              <div className="h-24 w-24 rounded-full border-4 border-white bg-[#2f5d73] text-white flex items-center justify-center text-2xl font-semibold shadow-md">
                {initials(ownerName)}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-0 pt-16 px-8 pb-10 text-center">
          <p className="text-[15px]" style={{ color: '#8a9aa3' }}>
            {ownerName} shared the following content
          </p>
          <h1 className="mt-3 text-[28px] leading-tight font-bold" style={{ color: '#1d3b4d' }}>
            {link.title}
          </h1>
          {link.description && (
            <p className="mt-2 text-sm" style={{ color: '#6b7c86' }}>
              {link.description}
            </p>
          )}
          <p className="mt-4 text-[13px] leading-relaxed mx-auto max-w-[460px]" style={{ color: '#7a8b94' }}>
            By proceeding, you consent to Nexuses sending{' '}
            <a href="#insights" className="underline" style={{ color: '#2f8eb5' }}>
              insights
            </a>{' '}
            about your viewing activity to {ownerName} and their company, subject to their company&apos;s privacy
            policy.
          </p>

          {!unlocked ? (
            <form onSubmit={handleAgree} className="mt-8 text-left mx-auto max-w-[420px] rounded-md px-6 py-6" style={{ border: '1px solid #d8dee3', background: '#f7f8f9' }}>
              <label className="block text-[13px] mb-1.5" style={{ color: '#3d4f59' }}>
                Full Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-10 px-3 mb-4 bg-white outline-none"
                style={{ border: '1px solid #3d4f59', color: '#1d3b4d' }}
              />
              <label className="block text-[13px] mb-1.5" style={{ color: '#3d4f59' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 mb-4 bg-white outline-none"
                style={{ border: '1px solid #cfd6db', color: '#1d3b4d' }}
              />
              <p className="text-[11px] leading-snug mb-5" style={{ color: '#8a9aa3' }}>
                This webpage uses cookies to improve the service. By using this site, you agree to this use. See{' '}
                <a href="#cookie-policy" className="underline" style={{ color: '#2f8eb5' }}>
                  Cookie Policy
                </a>
                .
              </p>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full h-11 rounded-md text-white text-[16px] font-medium transition-colors"
                style={{
                  background: canSubmit ? '#4eb3d3' : '#b7dcea',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Please wait...' : 'Agree and view'}
              </button>
            </form>
          ) : (
            <div className="mt-8 text-left space-y-3">
              {(link.content || [])
                .filter((item) => item.type !== 'lead_form' && item.type !== 'utm')
                .map((item) => (
                  <div key={item.id} className="rounded-md border border-gray-200 p-4">
                    {item.type === 'pdf' && (
                      <div>
                        <p className="font-medium text-[#1d3b4d]">
                          {item.fileName || 'PDF'} — PDF, {item.pageCount ?? 0} pages
                        </p>
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" className="text-sm underline" style={{ color: '#2f8eb5' }}>
                            Open PDF
                          </a>
                        )}
                      </div>
                    )}
                    {item.type === 'ppt' && (
                      <div>
                        <p className="font-medium text-[#1d3b4d]">
                          PowerPoint presentation{item.slideCount ? `, ${item.slideCount} slides` : ''}
                        </p>
                        {item.fileUrl && (
                          <a href={item.fileUrl} target="_blank" className="text-sm underline" style={{ color: '#2f8eb5' }}>
                            Open presentation
                          </a>
                        )}
                      </div>
                    )}
                    {item.type === 'video' && item.fileUrl && (
                      <video src={item.fileUrl} controls className="w-full rounded" />
                    )}
                    {item.type === 'image' && item.fileUrl && (
                      <img src={item.fileUrl} alt="" className="w-full rounded" />
                    )}
                    {item.type === 'website' && item.url && (
                      <a href={item.url} target="_blank" className="underline" style={{ color: '#2f8eb5' }}>
                        {item.url}
                      </a>
                    )}
                    {item.type === 'html' && item.html && (
                      <div dangerouslySetInnerHTML={{ __html: item.html }} />
                    )}
                    {item.type === 'doc' && item.fileUrl && (
                      <a href={item.fileUrl} target="_blank" className="underline" style={{ color: '#2f8eb5' }}>
                        Download document
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
