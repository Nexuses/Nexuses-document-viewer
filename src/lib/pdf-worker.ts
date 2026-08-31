/**
 * Point PDF.js at the official worker for the installed pdfjs-dist version.
 * Keeps the repo TypeScript-only (no committed .mjs worker file).
 */
export function configurePdfWorker(pdfjs: {
  GlobalWorkerOptions: { workerSrc: string };
  version?: string;
}) {
  if (typeof window === 'undefined') return;

  const version = pdfjs.version || '5.4.296';
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}
