'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ViewerToolbar } from './ViewerStage';
import PptSlideStack from './PptSlideStack';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const PDF_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/',
};

interface Props {
  url: string;
  kind?: 'pdf' | 'ppt' | 'doc';
  expectedPages?: number;
  onPagesLoaded?: (count: number) => void;
}

function officeEmbedUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function filePath(url: string) {
  try {
    return new URL(url, 'http://localhost').pathname.toLowerCase();
  } catch {
    return url.split('?')[0].toLowerCase();
  }
}

function isLegacyPpt(url: string) {
  const path = filePath(url);
  return path.endsWith('.ppt') && !path.endsWith('.pptx');
}

function shouldUsePdfEngine(url: string, kind?: string) {
  const path = filePath(url);
  if (path.endsWith('.pdf')) return true;
  if (/\.(ppt|pptx|doc|docx)$/.test(path)) return false;
  return kind === 'pdf';
}

function shouldUseOffice(url: string, kind?: string) {
  if (kind === 'doc') return true;
  if (kind === 'ppt' && isLegacyPpt(url)) return true;
  const path = filePath(url);
  return /\.(doc|docx)$/.test(path);
}

function offsetTopIn(el: HTMLElement, root: HTMLElement) {
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

export default function SmartLinkDocumentPane({ url, kind = 'pdf', expectedPages, onPagesLoaded }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(900);
  const [useOffice, setUseOffice] = useState(() => shouldUseOffice(url, kind));
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const pdfOptions = useRef(PDF_OPTIONS).current;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageRef = useRef(1);
  const programmaticScroll = useRef(false);
  const rafRef = useRef<number | null>(null);
  const unlockTimer = useRef<number | null>(null);

  pageRef.current = page;

  const onPagesLoadedRef = useRef(onPagesLoaded);
  onPagesLoadedRef.current = onPagesLoaded;

  const showPdf = !useOffice && shouldUsePdfEngine(url, kind);
  const showPpt = !useOffice && kind === 'ppt' && !showPdf;

  useEffect(() => {
    setPage(1);
    pageRef.current = 1;
    setScale(1);
    setNumPages(0);
    setUseOffice(shouldUseOffice(url, kind));
    pageRefs.current.clear();
  }, [url, kind]);

  useEffect(() => {
    if (useOffice && expectedPages && expectedPages > 0) {
      onPagesLoadedRef.current?.(expectedPages);
    }
  }, [useOffice, expectedPages, url]);

  useEffect(() => {
    if (!container) return;
    const measure = () => setPageWidth(Math.max(560, Math.min(container.clientWidth - 32, 1100)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const onPdfLoad = useCallback(({ numPages: count }: { numPages: number }) => {
    setUseOffice(false);
    setNumPages(count);
    onPagesLoadedRef.current?.(count);
  }, []);

  const onPptLoad = useCallback((count: number) => {
    setNumPages(count);
    onPagesLoadedRef.current?.(count);
  }, []);

  const totalPages = numPages || expectedPages || 1;

  const syncPageFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || programmaticScroll.current) return;

    if (useOffice) {
      const next = Math.min(
        totalPages,
        Math.max(1, Math.round(root.scrollTop / Math.max(root.clientHeight, 1)) + 1)
      );
      if (next !== pageRef.current) {
        pageRef.current = next;
        setPage(next);
      }
      return;
    }

    const marker = root.getBoundingClientRect().top + root.clientHeight * 0.28;
    let current = pageRef.current;
    pageRefs.current.forEach((el, number) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= marker && rect.bottom > marker) current = number;
    });
    if (current !== pageRef.current) {
      pageRef.current = current;
      setPage(current);
    }
  }, [useOffice, totalPages]);

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next));
    pageRef.current = clamped;
    setPage(clamped);

    const root = scrollerRef.current;
    if (!root) return;

    programmaticScroll.current = true;
    const el = pageRefs.current.get(clamped);
    const top = el ? offsetTopIn(el, root) : (clamped - 1) * root.clientHeight;
    root.scrollTo({ top, behavior: 'smooth' });

    if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      programmaticScroll.current = false;
      syncPageFromScroll();
    }, 450);
  };

  const onScrollerScroll = () => {
    if (programmaticScroll.current) return;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(syncPageFromScroll);
  };

  const zoomIn = () => setScale((s) => Math.min(2.5, Math.round((s + 0.1) * 10) / 10));
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10));

  const toggleFullscreen = async () => {
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen();
  };

  return (
    <div ref={setContainer} className="relative h-full w-full bg-[#edf1f4]">
      <div ref={scrollerRef} className="h-full w-full overflow-y-auto overflow-x-hidden" onScroll={onScrollerScroll}>
        {showPdf && (
          <Document
            key={url}
            file={url}
            onLoadSuccess={onPdfLoad}
            loading={<div className="p-10 text-sm text-gray-500">Loading document...</div>}
            error={<div className="p-10 text-sm text-red-600">Failed to load document.</div>}
            options={pdfOptions}
          >
            {numPages > 0 &&
              Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <div
                    key={pageNumber}
                    data-page={pageNumber}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNumber, el);
                      else pageRefs.current.delete(pageNumber);
                    }}
                    className={`flex justify-center px-3 py-3 ${pageNumber === numPages ? 'pb-28' : ''}`}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={pageWidth * scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                );
              })}
          </Document>
        )}

        {showPpt && (
          <PptSlideStack
            url={url}
            width={pageWidth}
            scale={scale}
            onLoad={onPptLoad}
            onError={() => setUseOffice(true)}
            onPageRef={(pageNumber, el) => {
              if (el) pageRefs.current.set(pageNumber, el);
              else pageRefs.current.delete(pageNumber);
            }}
          />
        )}

        {useOffice && (
          <iframe
            title="Office document"
            src={officeEmbedUrl(url)}
            className="w-full border-0 bg-white"
            style={{ height: '100%', minHeight: '100%' }}
          />
        )}
      </div>

      <ViewerToolbar
        page={page}
        pages={totalPages}
        scale={scale}
        onPrev={() => goToPage(pageRef.current - 1)}
        onNext={() => goToPage(pageRef.current + 1)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}
