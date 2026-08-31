'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { configurePdfWorker } from '@/lib/pdf-worker';

configurePdfWorker(pdfjs);

const PDF_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
  cMapPacked: true,
};

export default function PdfThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !url) {
    return (
      <div className="h-[52px] w-[84px] shrink-0 rounded-xs bg-[#31424c] text-[10px] text-[#c5d0d6] flex items-center justify-center">
        PDF
      </div>
    );
  }

  return (
    <div className="h-[52px] w-[84px] shrink-0 overflow-hidden rounded-xs bg-white">
      <Document file={url} options={PDF_OPTIONS} loading={null} onLoadError={() => setFailed(true)}>
        <Page pageNumber={1} width={84} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>
    </div>
  );
}
