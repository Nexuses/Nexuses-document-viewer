'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClientGeo } from '@/hooks/useClientGeo';
import { getClientGeo } from '@/lib/geo';
import { getDocumentPageCount, resolveMediaUrl } from '@/lib/document-meta';
import type { SmartLink, SmartLinkContentItem } from '@/lib/smart-link-types';
import ViewerErrorBoundary from './ViewerErrorBoundary';
import ViewerStage from './ViewerStage';

const SmartLinkDocumentPane = dynamic(() => import('./SmartLinkDocumentPane'), { ssr: false });
const PdfThumbnail = dynamic(() => import('./PdfThumbnail'), { ssr: false });

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

function hostname(url?: string) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function youtubeId(url?: string) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return m?.[1] || null;
}

function viewableItems(link: SmartLink) {
  return (link.content || []).filter((item) => item.type !== 'lead_form' && item.type !== 'utm');
}

function itemTitle(item: SmartLinkContentItem) {
  if (item.title) return item.title;
  if (item.fileName) return item.fileName.replace(/\.[^.]+$/, '');
  if (item.url) return hostname(item.url) || item.url;
  return item.type.toUpperCase();
}

function itemMeta(item: SmartLinkContentItem, pages?: number) {
  if (item.type === 'pdf') return pages ? `PDF, ${pages} pages` : 'PDF';
  if (item.type === 'ppt') return pages ? `PPT, ${pages} slides` : item.slideCount ? `PPT, ${item.slideCount} slides` : 'PPT';
  if (item.type === 'doc') return pages ? `DOC, ${pages} pages` : 'DOC';
  const yt = youtubeId(item.url || item.fileUrl);
  if (yt) return 'youtube.com';
  if (item.type === 'video') return hostname(item.fileUrl) || 'Video';
  if (item.type === 'website') return hostname(item.url) || 'Website';
  if (item.type === 'image') return 'Image';
  if (item.type === 'html') return 'HTML';
  return item.type;
}

function Thumbnail({ item }: { item: SmartLinkContentItem }) {
  const yt = youtubeId(item.url || item.fileUrl);
  if (item.type === 'pdf' && item.fileUrl) {
    return <PdfThumbnail url={item.fileUrl} />;
  }
  if (yt) {
    return (
      <img
        src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`}
        alt=""
        className="h-[52px] w-[84px] shrink-0 rounded-[2px] object-cover bg-black"
      />
    );
  }
  if (item.type === 'image' && item.fileUrl) {
    return <img src={item.fileUrl} alt="" className="h-[52px] w-[84px] shrink-0 rounded-[2px] object-cover" />;
  }
  if (item.type === 'website' && item.url) {
    return (
      <img
        src={`https://image.thum.io/get/width/168/crop/104/${item.url}`}
        alt=""
        className="h-[52px] w-[84px] shrink-0 rounded-[2px] object-cover bg-[#31424c]"
      />
    );
  }
  return (
    <div className="h-[52px] w-[84px] shrink-0 rounded-[2px] bg-[#31424c] text-[10px] text-[#c5d0d6] flex items-center justify-center">
      {item.type === 'ppt' ? 'PPT' : item.type === 'doc' ? 'DOC' : item.type.toUpperCase().slice(0, 3)}
    </div>
  );
}

function LoopingVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      void video.play().catch(() => {});
    };

    video.loop = true;
    video.currentTime = 0;
    tryPlay();
    video.addEventListener('loadeddata', tryPlay, { once: true });
    video.addEventListener('canplay', tryPlay, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
    };
  }, [src]);

  return (
    <div className="h-full w-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        key={src}
        src={src}
        controls
        autoPlay
        loop
        playsInline
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function htmlDocument(html: string) {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; min-height: 100%; background: #fff; }
      img, video, iframe { max-width: 100%; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function HtmlFrame({ html, url, title }: { html?: string; url?: string; title: string }) {
  const [srcDoc, setSrcDoc] = useState(() => (html ? htmlDocument(html) : undefined));

  useEffect(() => {
    if (html) {
      setSrcDoc(htmlDocument(html));
      return;
    }
    if (!url) {
      setSrcDoc(undefined);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveMediaUrl(url);
        const res = await fetch(resolved);
        if (!res.ok) throw new Error('Failed to load HTML');
        const type = res.headers.get('content-type') || '';
        if (type.includes('application/json')) throw new Error('Unexpected JSON');
        const text = await res.text();
        if (!cancelled) setSrcDoc(htmlDocument(text));
      } catch {
        if (!cancelled) setSrcDoc(undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html, url]);

  if (srcDoc) {
    return (
      <iframe
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        className="h-full w-full border-0 bg-white"
      />
    );
  }

  if (url) {
    return <iframe title={title} src={url} className="h-full w-full border-0 bg-white" />;
  }

  return <div className="h-full flex items-center justify-center text-gray-500 text-sm">This content cannot be previewed.</div>;
}

function ContentPane({
  item,
  pageCount,
  onPagesLoaded,
}: {
  item: SmartLinkContentItem;
  pageCount?: number;
  onPagesLoaded: (count: number) => void;
}) {
  const yt = youtubeId(item.url || item.fileUrl);
  const fileUrl = item.fileUrl || item.url;
  if ((item.type === 'pdf' || item.type === 'ppt' || item.type === 'doc') && fileUrl) {
    return (
      <SmartLinkDocumentPane
        url={fileUrl}
        kind={item.type}
        expectedPages={pageCount || item.pageCount || item.slideCount}
        onPagesLoaded={onPagesLoaded}
      />
    );
  }

  const body = (() => {
    if (yt) {
      return (
        <iframe
          title={itemTitle(item)}
          src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}`}
          className="h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (item.type === 'video' && item.fileUrl) {
      return <LoopingVideo src={item.fileUrl} />;
    }
    if (item.type === 'image' && item.fileUrl) {
      return <img src={item.fileUrl} alt={itemTitle(item)} className="max-w-none" />;
    }
    if (item.type === 'website' && item.url) {
      return <iframe title={itemTitle(item)} src={item.url} className="h-full w-full border-0 bg-white" />;
    }
    if (item.type === 'html' && (item.html || item.fileUrl || item.url)) {
      return <HtmlFrame html={item.html} url={item.fileUrl || item.url} title={itemTitle(item)} />;
    }
    return <div className="h-full flex items-center justify-center text-gray-500 text-sm">This content cannot be previewed.</div>;
  })();

  return (
    <ViewerStage
      resetKey={item.id}
      pages={1}
      mode={item.type === 'image' ? 'fit' : 'fill'}
    >
      {body}
    </ViewerStage>
  );
}

export default function SmartLinkViewer({ link }: { link: SmartLink }) {
  const items = useMemo(() => viewableItems(link), [link]);
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selected = items.find((i) => i.id === selectedId) || items[0];
  const ownerName = displayName(link.owner);
  const geoRef = useClientGeo();
  const sessionIdRef = useRef('');
  const lastViewRef = useRef<number | null>(null);
  const openedRef = useRef(false);
  const prevSelectedIdRef = useRef<string | undefined>(undefined);

  const trackEvent = useCallback(
    async (
      action: 'smart_link_view' | 'content_view' | 'session_end' | 'download',
      item?: SmartLinkContentItem,
      timeSpent?: number
    ) => {
      const sessionId =
        sessionIdRef.current ||
        (typeof window !== 'undefined' ? window.localStorage.getItem('smart-link-session') : null);
      if (!sessionId) return;
      sessionIdRef.current = sessionId;
      const geo =
        geoRef.current.country || geoRef.current.countryCode
          ? geoRef.current
          : await getClientGeo();
      geoRef.current = geo;
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            action,
            assetId: item?.id,
            assetTitle: item ? itemTitle(item) : undefined,
            smartLinkId: link._id,
            smartLinkSlug: link.slug,
            smartLinkTitle: link.title,
            timeSpent,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            country: geo.country,
            countryCode: geo.countryCode,
            region: geo.region,
            city: geo.city,
          }),
        });
      } catch {
        // ignore tracking failures
      }
    },
    [link._id, link.slug, link.title]
  );

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void trackEvent('smart_link_view');
    lastViewRef.current = Date.now();
  }, [trackEvent]);

  useEffect(() => {
    if (!selected) return;
    if (prevSelectedIdRef.current && lastViewRef.current) {
      const timeSpent = Math.floor((Date.now() - lastViewRef.current) / 1000);
      if (timeSpent > 0) void trackEvent('session_end', undefined, timeSpent);
    }
    void trackEvent('content_view', selected);
    prevSelectedIdRef.current = selected.id;
    lastViewRef.current = Date.now();
  }, [selected?.id, trackEvent, selected]);

  useEffect(() => {
    const flush = () => {
      if (!lastViewRef.current) return;
      const timeSpent = Math.floor((Date.now() - lastViewRef.current) / 1000);
      if (timeSpent <= 0) return;
      const sessionId = sessionIdRef.current || window.localStorage.getItem('smart-link-session');
      if (!sessionId) return;
      const blob = new Blob(
        [
          JSON.stringify({
            sessionId,
            action: 'session_end',
            timeSpent,
            smartLinkId: link._id,
            smartLinkSlug: link.slug,
            smartLinkTitle: link.title,
            userAgent: navigator.userAgent,
            country: geoRef.current.country,
            countryCode: geoRef.current.countryCode,
            region: geoRef.current.region,
            city: geoRef.current.city,
          }),
        ],
        { type: 'application/json' }
      );
      navigator.sendBeacon('/api/analytics', blob);
    };

    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [link._id, link.slug, link.title]);

  useEffect(() => {
    let cancelled = false;

    items.forEach((item) => {
      if (item.type !== 'pdf' && item.type !== 'ppt' && item.type !== 'doc') return;
      if (!(item.fileUrl || item.url)) return;
      if (item.pageCount || item.slideCount) return;

      void getDocumentPageCount(item).then((count) => {
        if (cancelled || !count || count < 1) return;
        setPageCounts((prev) => (prev[item.id] === count ? prev : { ...prev, [item.id]: count }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  const download = (item: SmartLinkContentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.fileUrl) return;
    void trackEvent('download', item);
    const a = document.createElement('a');
    a.href = item.fileUrl;
    a.download = item.fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="h-dvh w-screen overflow-hidden flex max-md:flex-col"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#fff',
      }}
    >
      <header className="hidden max-md:flex shrink-0 h-14 items-center gap-3 px-3" style={{ background: '#1c2b36' }}>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Open content list"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-sm font-semibold truncate">{link.title}</p>
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          className="hidden max-md:block fixed inset-0 z-[60] bg-black/40"
          aria-label="Close content list"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`h-full w-[28%] min-w-[300px] max-w-[380px] shrink-0 flex flex-col max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[70] max-md:w-[min(86vw,340px)] max-md:min-w-0 max-md:max-w-none max-md:transition-transform ${
          sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
        style={{ background: '#1c2b36' }}
      >
        <div className="px-6 pt-6 pb-4 shrink-0">
          <div className="hidden max-md:flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 rounded-lg text-white/80 hover:bg-white/10"
              aria-label="Close content list"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-3">
            {link.companyLogo ? (
              <img src={link.companyLogo} alt="" className="h-11 w-11 rounded-full object-cover bg-white" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-[#3d5561] flex items-center justify-center text-[15px] font-semibold">
                {initials(ownerName)}
              </div>
            )}
            <p className="text-[16px] font-normal truncate">{ownerName}</p>
          </div>
          <h1 className="mt-6 text-[22px] leading-[1.25] font-semibold">{link.title}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {items.map((item) => {
            const active = item.id === selected?.id;
            const pages = item.pageCount || item.slideCount || pageCounts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setSidebarOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-2 py-[10px] mb-0.5"
                style={{ background: active ? '#2a3b45' : 'transparent' }}
              >
                <Thumbnail item={item} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-[1.2] truncate text-white">{itemTitle(item)}</p>
                  <p className="text-[12px] mt-1 truncate" style={{ color: '#b7c4cb' }}>
                    {itemMeta(item, pages)}
                  </p>
                </div>
                {active && item.fileUrl && (item.type === 'pdf' || item.type === 'ppt' || item.type === 'doc') && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => download(item, e)}
                    className="p-1 text-white shrink-0"
                    title="Download"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0 px-6 py-4">
          <div className="flex items-center gap-4 text-[12px]" style={{ color: '#9aadb6' }}>
            <a href="#privacy-policy" className="hover:text-white">
              Privacy policy
            </a>
            <a href="#cookie-policy" className="hover:text-white">
              Cookie policy
            </a>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-white">
            {link.companyLogo ? (
              <img src={link.companyLogo} alt="" className="h-5 w-5 object-contain" />
            ) : (
              <span className="h-5 w-5 rounded-[3px] bg-white text-[#1c2b36] text-[11px] font-bold flex items-center justify-center">
                N
              </span>
            )}
            <span>Powered by Nexuses</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-full bg-white overflow-hidden max-md:min-h-0">
        {selected ? (
          <ViewerErrorBoundary>
            <ContentPane
              item={selected}
              pageCount={selected.pageCount || selected.slideCount || pageCounts[selected.id]}
              onPagesLoaded={(count) =>
                setPageCounts((prev) => (prev[selected.id] === count ? prev : { ...prev, [selected.id]: count }))
              }
            />
          </ViewerErrorBoundary>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">No content to display.</div>
        )}
      </main>
    </div>
  );
}
