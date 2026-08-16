'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ViewerToolbar } from './ViewerStage';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface Props {
  url: string;
  onPagesLoaded?: (count: number) => void;
}

export default function SmartLinkDocumentPane({ url, onPagesLoaded }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(900);

  const options = useMemo(
    () => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/',
    }),
    []
  );

  useEffect(() => {
    setPage(1);
    setScale(1);
    setNumPages(0);
  }, [url]);

  useEffect(() => {
    if (!container) return;
    const measure = () => setPageWidth(Math.max(640, container.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const onLoad = useCallback(
    ({ numPages: count }: { numPages: number }) => {
      setNumPages(count);
      onPagesLoaded?.(count);
    },
    [onPagesLoaded]
  );

  const zoomIn = () => setScale((s) => Math.min(2.5, Math.round((s + 0.1) * 10) / 10));
  const zoomOut = () => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10));

  const toggleFullscreen = async () => {
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen();
  };

  return (
    <div ref={setContainer} className="relative h-full w-full bg-white">
      <div className="h-full w-full overflow-auto">
        <Document
          key={url}
          file={url}
          onLoadSuccess={onLoad}
          loading={<div className="p-10 text-sm text-gray-500">Loading document...</div>}
          error={<div className="p-10 text-sm text-red-600">Failed to load document.</div>}
          options={options}
        >
          <Page
            pageNumber={page}
            width={pageWidth * scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      <ViewerToolbar
        page={page}
        pages={numPages}
        scale={scale}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(numPages || 1, p + 1))}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}
