'use client';

import { useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const PDF_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
  cMapPacked: true,
};

export default function PdfThumbnail({
  url,
  onPagesLoaded,
}: {
  url: string;
  onPagesLoaded?: (count: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  const onPagesLoadedRef = useRef(onPagesLoaded);
  onPagesLoadedRef.current = onPagesLoaded;

  if (failed || !url) {
    return (
      <div className="h-[52px] w-[84px] shrink-0 rounded-[2px] bg-[#31424c] text-[10px] text-[#c5d0d6] flex items-center justify-center">
        PDF
      </div>
    );
  }

  return (
    <div className="h-[52px] w-[84px] shrink-0 overflow-hidden rounded-[2px] bg-white">
      <Document
        file={url}
        options={PDF_OPTIONS}
        loading={null}
        onLoadSuccess={({ numPages }) => onPagesLoadedRef.current?.(numPages)}
        onLoadError={() => setFailed(true)}
      >
        <Page pageNumber={1} width={84} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>
    </div>
  );
}
