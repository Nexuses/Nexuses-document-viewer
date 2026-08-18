'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
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

function Thumbnail({
  item,
  onPagesLoaded,
}: {
  item: SmartLinkContentItem;
  onPagesLoaded?: (count: number) => void;
}) {
  const yt = youtubeId(item.url || item.fileUrl);
  if (item.type === 'pdf' && item.fileUrl) {
    return <PdfThumbnail url={item.fileUrl} onPagesLoaded={onPagesLoaded} />;
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

function ContentPane({
  item,
  onPagesLoaded,
}: {
  item: SmartLinkContentItem;
  onPagesLoaded: (count: number) => void;
}) {
  const yt = youtubeId(item.url || item.fileUrl);
  const fileUrl = item.fileUrl || item.url;
  if ((item.type === 'pdf' || item.type === 'ppt' || item.type === 'doc') && fileUrl) {
    return (
      <SmartLinkDocumentPane
        url={fileUrl}
        kind={item.type}
        expectedPages={item.pageCount || item.slideCount}
        onPagesLoaded={onPagesLoaded}
      />
    );
  }

  const body = (() => {
    if (yt) {
      return (
        <iframe
          title={itemTitle(item)}
          src={`https://www.youtube.com/embed/${yt}`}
          className="h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (item.type === 'video' && item.fileUrl) {
      return (
        <div className="h-full w-full bg-black flex items-center justify-center">
          <video src={item.fileUrl} controls className="h-full w-full object-contain" />
        </div>
      );
    }
    if (item.type === 'image' && item.fileUrl) {
      return <img src={item.fileUrl} alt={itemTitle(item)} className="max-w-none" />;
    }
    if (item.type === 'website' && item.url) {
      return <iframe title={itemTitle(item)} src={item.url} className="h-full w-full border-0 bg-white" />;
    }
    if (item.type === 'html' && item.html) {
      return (
        <iframe
          title={itemTitle(item)}
          srcDoc={item.html}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0 bg-white"
        />
      );
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
  const selected = items.find((i) => i.id === selectedId) || items[0];
  const ownerName = displayName(link.owner);

  const rememberPages = (id: string, count: number) => {
    if (!count) return;
    setPageCounts((prev) => (prev[id] === count ? prev : { ...prev, [id]: count }));
  };

  const download = (item: SmartLinkContentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.fileUrl) return;
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
      className="h-dvh w-screen overflow-hidden flex"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#fff',
      }}
    >
      <aside className="h-full w-[28%] min-w-[300px] max-w-[380px] shrink-0 flex flex-col" style={{ background: '#1c2b36' }}>
        <div className="px-6 pt-6 pb-4 shrink-0">
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
                onClick={() => setSelectedId(item.id)}
                className="w-full text-left flex items-center gap-3 px-2 py-[10px] mb-0.5"
                style={{ background: active ? '#2a3b45' : 'transparent' }}
              >
                <Thumbnail item={item} onPagesLoaded={(count) => rememberPages(item.id, count)} />
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

      <main className="flex-1 min-w-0 h-full bg-white overflow-hidden">
        {selected ? (
          <ViewerErrorBoundary>
            <ContentPane
              item={selected}
              onPagesLoaded={(count) => rememberPages(selected.id, count)}
            />
          </ViewerErrorBoundary>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">No content to display.</div>
        )}
      </main>
    </div>
  );
}
