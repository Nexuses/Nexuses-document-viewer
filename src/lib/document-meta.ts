import type { SmartLinkContentItem } from '@/lib/smart-link-types';

function bufferToLatin1(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

export async function resolveMediaUrl(url: string): Promise<string> {
  if (typeof window === 'undefined') return url;

  if (url.includes('/api/files/s3/')) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const type = res.headers.get('content-type') || '';
        if (type.includes('json')) {
          const data = (await res.json()) as { url?: string };
          if (data.url) return data.url;
        }
      }
    } catch {
      // fall through
    }
  }

  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  return url;
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const resolved = await resolveMediaUrl(url);
  const res = await fetch(resolved);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.arrayBuffer();
}

export function countPptxSlides(buffer: ArrayBuffer): number {
  const names = bufferToLatin1(buffer).match(/ppt\/slides\/slide\d+\.xml/g);
  if (!names?.length) return 0;
  return new Set(names).size;
}

export function countDocxPages(buffer: ArrayBuffer): number {
  const text = bufferToLatin1(buffer);
  const rendered = text.match(/<w:lastRenderedPageBreak/g);
  if (rendered?.length) return rendered.length + 1;
  const pageBreaks = text.match(/<w:br[^>]*w:type="page"/g);
  if (pageBreaks?.length) return pageBreaks.length + 1;
  return 1;
}

export async function countPdfPagesFromUrl(url: string): Promise<number | undefined> {
  try {
    const resolved = await resolveMediaUrl(url);
    const { pdfjs } = await import('react-pdf');
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    const pdf = await pdfjs.getDocument(resolved).promise;
    return pdf.numPages;
  } catch {
    return undefined;
  }
}

export async function getDocumentPageCount(
  item: Pick<SmartLinkContentItem, 'type' | 'fileUrl' | 'url' | 'pageCount' | 'slideCount'>
): Promise<number | undefined> {
  const stored = item.type === 'ppt' ? item.slideCount : item.pageCount;
  if (stored && stored > 0) return stored;

  const fileUrl = item.fileUrl || item.url;
  if (!fileUrl) return undefined;

  try {
    if (item.type === 'pdf') {
      return await countPdfPagesFromUrl(fileUrl);
    }

    const buffer = await fetchArrayBuffer(fileUrl);
    if (item.type === 'ppt') {
      const slides = countPptxSlides(buffer);
      return slides > 0 ? slides : undefined;
    }
    if (item.type === 'doc') {
      const pages = countDocxPages(buffer);
      return pages > 0 ? pages : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
