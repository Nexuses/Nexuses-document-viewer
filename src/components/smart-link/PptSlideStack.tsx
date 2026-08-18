'use client';

import { useEffect, useRef, useState } from 'react';
import type { PptxRenderer } from 'pptx-browser';

const OFFICE_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

const DEFAULT_THEME: Record<string, string> = {
  dk1: '000000',
  lt1: 'FFFFFF',
  dk2: '44546A',
  lt2: 'E7E6E6',
  accent1: '4472C4',
  accent2: 'ED7D31',
  accent3: 'A9D08E',
  accent4: 'FFC000',
  accent5: '5B9BD5',
  accent6: '70AD47',
  hlink: '0563C1',
  folHlink: '954F72',
  bg1: 'FFFFFF',
  tx1: '000000',
  bg2: 'E7E6E6',
  tx2: '44546A',
};

function patchOoxmlDom() {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __ooxmlDomPatched?: boolean };
  if (w.__ooxmlDomPatched) return;
  w.__ooxmlDomPatched = true;

  const originalGetAttribute = Element.prototype.getAttribute;
  Element.prototype.getAttribute = function patchedGetAttribute(name) {
    const value = originalGetAttribute.call(this, name);
    if (value !== null) return value;
    if (typeof name === 'string' && name.startsWith('r:')) {
      const local = name.slice(2);
      return this.getAttributeNS(OFFICE_REL_NS, local) ?? this.getAttributeNS(PACKAGE_REL_NS, local);
    }
    return value;
  };

  const wrapTagName = (proto: { getElementsByTagName: (name: string) => HTMLCollectionOf<Element> }) => {
    const original = proto.getElementsByTagName;
    proto.getElementsByTagName = function patchedGetElementsByTagName(this: Document | Element, name: string) {
      const result = original.call(this, name);
      if (result.length > 0 || name === '*' || typeof name !== 'string') return result;
      if (typeof (this as Element).getElementsByTagNameNS === 'function') {
        return (this as Element).getElementsByTagNameNS('*', name) as unknown as HTMLCollectionOf<Element>;
      }
      return result;
    };
  };

  wrapTagName(Document.prototype);
  wrapTagName(Element.prototype);
}

async function resolveMediaUrl(url: string): Promise<string> {
  if (!url.includes('/api/files/s3/')) return url;
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') || '';
    if (type.includes('json')) {
      const data = (await res.json()) as { url?: string };
      if (data.url) return data.url;
    }
  } catch {
    // fall through
  }
  return url;
}

async function fetchPptxBuffer(url: string): Promise<ArrayBuffer> {
  const resolved = await resolveMediaUrl(url);
  try {
    const res = await fetch(resolved);
    if (res.ok) {
      const type = res.headers.get('content-type') || '';
      if (!type.includes('application/json')) return res.arrayBuffer();
    }
  } catch {
    // CORS — try same-origin proxy
  }
  const proxied = await fetch(`/api/file-proxy?url=${encodeURIComponent(resolved)}`);
  if (!proxied.ok) throw new Error('Failed to load presentation');
  return proxied.arrayBuffer();
}

function recoverSlidePaths(renderer: PptxRenderer) {
  const internal = renderer as PptxRenderer & {
    _files?: Record<string, Uint8Array>;
    slidePaths: string[];
    themeColors: Record<string, string>;
  };
  const files = internal._files;
  const paths = internal.slidePaths;
  if (!files) return;
  if (paths.length > 0) {
    renderer.slideCount = paths.length;
  } else {
    const pres = files['ppt/presentation.xml'];
    const rels = files['ppt/_rels/presentation.xml.rels'];
    if (pres && rels) {
      const relDoc = new DOMParser().parseFromString(new TextDecoder().decode(rels), 'application/xml');
      const relMap: Record<string, string> = {};
      for (const rel of Array.from(relDoc.getElementsByTagNameNS('*', 'Relationship'))) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        const type = rel.getAttribute('Type') || '';
        if (!id || !target || !type.endsWith('/slide')) continue;
        relMap[id] = target.startsWith('/') ? target.slice(1) : `ppt/${target.replace(/^\.\//, '')}`;
      }

      const presDoc = new DOMParser().parseFromString(new TextDecoder().decode(pres), 'application/xml');
      for (const sldId of Array.from(presDoc.getElementsByTagNameNS('*', 'sldId'))) {
        const rId = sldId.getAttributeNS(OFFICE_REL_NS, 'id') || sldId.getAttribute('r:id') || '';
        if (relMap[rId]) paths.push(relMap[rId]);
      }
    }

    if (paths.length === 0) {
      Object.keys(files)
        .map((key) => key.replace(/\\/g, '/'))
        .filter((key) => /^ppt\/slides\/slide\d+\.xml$/i.test(key))
        .sort((a, b) => Number(/slide(\d+)/i.exec(a)?.[1] || 0) - Number(/slide(\d+)/i.exec(b)?.[1] || 0))
        .forEach((key) => paths.push(key));
    }
    renderer.slideCount = paths.length;
  }

  internal.themeColors = { ...DEFAULT_THEME, ...internal.themeColors };
}

function canvasLooksEmpty(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width < 8 || canvas.height < 8) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let colored = 0;
  const step = Math.max(16, Math.floor(data.length / 800) * 4);
  for (let i = 0; i < data.length; i += step) {
    if (data[i + 3] < 12) continue;
    if (data[i] < 246 || data[i + 1] < 246 || data[i + 2] < 246) colored += 1;
  }
  return colored < 3;
}

export default function PptSlideStack({
  url,
  width,
  scale,
  onLoad,
  onError,
  onPageRef,
}: {
  url: string;
  width: number;
  scale: number;
  onLoad: (count: number) => void;
  onError: () => void;
  onPageRef: (page: number, el: HTMLDivElement | null) => void;
}) {
  const [slides, setSlides] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const widthRef = useRef(width);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  widthRef.current = width;
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSlides([]);

    (async () => {
      try {
        patchOoxmlDom();
        const { PptxRenderer } = await import('pptx-browser');
        if (cancelled) return;
        const renderer = new PptxRenderer();
        const buffer = await fetchPptxBuffer(url);
        await renderer.load(buffer);
        recoverSlidePaths(renderer);
        if (cancelled) {
          renderer.destroy();
          return;
        }
        if (renderer.slideCount < 1) {
          renderer.destroy();
          throw new Error('No slides found');
        }

        const renderWidth = Math.max(960, Math.round(widthRef.current * (window.devicePixelRatio || 1)));
        const images: string[] = [];
        for (let i = 0; i < renderer.slideCount; i++) {
          const canvas = document.createElement('canvas');
          await renderer.renderSlide(i, canvas, renderWidth);
          if (cancelled) {
            renderer.destroy();
            return;
          }
          if (i === 0 && canvasLooksEmpty(canvas)) {
            renderer.destroy();
            throw new Error('Rendered slides were empty');
          }
          images.push(canvas.toDataURL('image/jpeg', 0.92));
          setSlides([...images]);
          if (i === 0) {
            onLoadRef.current(renderer.slideCount);
            setLoading(false);
          }
        }
        onLoadRef.current(renderer.slideCount);
        setLoading(false);
        renderer.destroy();
      } catch {
        if (!cancelled) {
          setLoading(false);
          onErrorRef.current();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading && slides.length < 1) {
    return <div className="p-10 text-sm text-gray-500">Loading presentation...</div>;
  }

  const displayWidth = Math.max(320, width * scale);

  return (
    <>
      {slides.map((src, index) => {
        const pageNumber = index + 1;
        return (
          <div
            key={pageNumber}
            data-page={pageNumber}
            ref={(el) => onPageRef(pageNumber, el)}
            className={`flex justify-center px-3 py-3 ${pageNumber === slides.length ? 'pb-28' : ''}`}
          >
            <img
              src={src}
              alt={`Slide ${pageNumber}`}
              className="block bg-white shadow-sm"
              style={{ width: displayWidth, height: 'auto', aspectRatio: '16 / 9' }}
            />
          </div>
        );
      })}
    </>
  );
}
