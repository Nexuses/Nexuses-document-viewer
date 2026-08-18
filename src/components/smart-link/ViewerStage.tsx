'use client';

import { ReactNode, useEffect, useState } from 'react';

export function ViewerToolbar({
  page,
  pages,
  showPages = true,
  scale,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: {
  page: number;
  pages: number;
  showPages?: boolean;
  scale: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center z-30">
      <div
        className="pointer-events-auto flex items-center h-11 px-2 rounded-md text-white"
        style={{ background: 'rgba(38, 49, 56, 0.92)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}
      >
        {showPages && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrev();
              }}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center disabled:opacity-35"
              aria-label="Previous page"
            >
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M8.5 1.5L2 8l6.5 6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="min-w-[58px] text-center text-[13px] tracking-wide">
              {page} / {pages || 1}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
              disabled={page >= (pages || 1)}
              className="w-8 h-8 flex items-center justify-center disabled:opacity-35"
              aria-label="Next page"
            >
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M1.5 1.5L8 8l-6.5 6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="mx-1.5 h-5 w-px bg-white/35" />
          </>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onZoomIn();
          }}
          className="w-8 h-8 flex items-center justify-center text-[20px] leading-none"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onZoomOut();
          }}
          className="w-8 h-8 flex items-center justify-center text-[20px] leading-none"
          aria-label="Zoom out"
        >
          −
        </button>
        <div className="mx-1 w-[58px] h-7 rounded-[3px] bg-white text-[#2b3940] text-[12px] flex items-center justify-center">
          {Math.round(scale * 100)}%
        </div>
        <button type="button" onClick={onFullscreen} className="w-8 h-8 flex items-center justify-center" aria-label="Full screen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ZoomSurface({ scale, children }: { scale: number; children: ReactNode }) {
  const layoutScale = Math.max(scale, 1);

  return (
    <div
      className="grid place-items-center"
      style={{
        width: `${layoutScale * 100}%`,
        height: `${layoutScale * 100}%`,
        minWidth: '100%',
        minHeight: '100%',
      }}
    >
      <div
        className="h-full w-full"
        style={{
          width: `${100 / layoutScale}%`,
          height: `${100 / layoutScale}%`,
          transform: `scale(${scale})`,
          transformOrigin: scale >= 1 ? 'top left' : 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ViewerStage({
  children,
  resetKey,
  pages = 1,
  mode = 'fill',
}: {
  children: ReactNode;
  resetKey: string;
  pages?: number;
  mode?: 'fill' | 'fit';
}) {
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(1);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScale(1);
    setPage(1);
  }, [resetKey]);

  const toggleFullscreen = async () => {
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen();
  };

  return (
    <div ref={setContainer} className="relative h-full w-full bg-white">
      <div className="h-full w-full overflow-auto">
        {mode === 'fill' ? (
          <ZoomSurface scale={scale}>{children}</ZoomSurface>
        ) : (
          <div className="flex min-h-full min-w-full justify-center">
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                marginBottom: scale > 1 ? `${(scale - 1) * 100}%` : 0,
              }}
            >
              {children}
            </div>
          </div>
        )}
      </div>
      <ViewerToolbar
        page={page}
        pages={pages}
        scale={scale}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages || 1, p + 1))}
        onZoomIn={() => setScale((s) => Math.min(2.5, Math.round((s + 0.1) * 10) / 10))}
        onZoomOut={() => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}
