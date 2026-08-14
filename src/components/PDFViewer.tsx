'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import ShareButton from '@/components/ShareButton';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use version that matches react-pdf's pdfjs-dist
if (typeof window !== 'undefined') {
  // Use local worker file from public directory (matches react-pdf's pdfjs-dist version)
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PDFViewerProps {
  url: string;
  onDownload?: () => void;
  onOpenSidebar?: () => void;
}

export default function PDFViewer({ url, onDownload, onOpenSidebar }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationPage, setPresentationPage] = useState(1);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [firstPageLoaded, setFirstPageLoaded] = useState(false);
  const [pageWidth, setPageWidth] = useState(() => {
    if (typeof window === 'undefined') return 1200;
    return Math.max(window.innerWidth - 320, 800);
  });
  
  // Use much smaller initial width for fastest first render
  const initialPageWidth = useMemo(() => {
    if (typeof window === 'undefined') return 500;
    return Math.min(500, Math.max(window.innerWidth - 320, 400)); // Very small initial size
  }, []);

  // Refs to prevent infinite loops
  const documentLoadedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const urlRef = useRef<string>(url);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const documentCacheRef = useRef<Map<string, { numPages: number; timestamp: number }>>(new Map());

  // Stable HTTP headers object - must be outside useMemo to prevent recreation
  const httpHeaders = useMemo(() => ({
    'Accept-Ranges': 'bytes',
  }), []);

  // Ultra-fast options for first page only - CRITICAL OPTIMIZATIONS
  const firstPageOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/',
    // CRITICAL: Enable streaming and range requests - this is KEY for large files
    // These MUST be false to enable range requests and streaming
    disableAutoFetch: false,
    disableStream: false,
    // CRITICAL: Use range requests - browser will only download what's needed
    httpHeaders,
    verbosity: 0,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: false,
    // CRITICAL: Very small chunks to start rendering immediately
    rangeChunkSize: 8192, // 8KB chunks - smallest possible for fastest start
    // Allow large images so nothing disappears in complex PDFs
    maxImageSize: -1, // -1 = no limit
  }), [httpHeaders]);

  // Optimized PDF.js options for full document
  const documentOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/',
    disableAutoFetch: false,
    disableStream: false,
    // CRITICAL: Ensure range requests work
    httpHeaders,
    verbosity: 0,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: false,
    // Use larger chunks for full document (but still reasonable)
    rangeChunkSize: 32768, // 32KB chunks for balance
    // Allow large images so nothing disappears in complex PDFs
    maxImageSize: -1, // -1 = no limit
  }), [httpHeaders]);

  // Update URL ref when it changes - optimized to prevent unnecessary reloads
  useEffect(() => {
    if (urlRef.current !== url) {
      const previousUrl = urlRef.current;
      urlRef.current = url;
      
      // Check if we have cached data for this URL (within last 5 minutes)
      const cached = documentCacheRef.current.get(url);
      const cacheValid = cached && (Date.now() - cached.timestamp < 5 * 60 * 1000);
      
      if (cacheValid && cached) {
        // Use cached data - don't reset everything
        setNumPages(cached.numPages);
        setLoading(false);
        setError(null);
        setVisiblePages(new Set([1, 2]));
        setLoadedPages(new Set([1]));
        setFirstPageLoaded(true); // Skip first page Document for cached docs
        // Keep documentLoadedRef to prevent re-processing
        documentLoadedRef.current = url;
      } else {
        // New URL or cache expired - full reset
        documentLoadedRef.current = null;
        isProcessingRef.current = false;
        setNumPages(null);
        setLoading(true);
        setError(null);
        setPresentationPage(1);
        setVisiblePages(new Set([1]));
        setLoadedPages(new Set());
        setFirstPageLoaded(false); // Show first page Document
        pageRefs.current.clear();
      }
    }
  }, [url]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(Math.max(window.innerWidth - 320, 800));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (typeof window === 'undefined' || !numPages) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisiblePages = new Set(visiblePages);
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
          if (pageNum > 0) {
            if (entry.isIntersecting) {
              newVisiblePages.add(pageNum);
              // Preload adjacent pages
              if (pageNum > 1) newVisiblePages.add(pageNum - 1);
              if (pageNum < numPages) newVisiblePages.add(pageNum + 1);
            }
          }
        });
        setVisiblePages(newVisiblePages);
      },
      {
        root: null,
        rootMargin: '200px', // Start loading 200px before page is visible
        threshold: 0.01,
      }
    );

    // Observe all page containers
    pageRefs.current.forEach((ref) => {
      if (ref) observerRef.current?.observe(ref);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [numPages, visiblePages]);

  // Register page refs for intersection observer
  const registerPageRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNum, element);
      observerRef.current?.observe(element);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, []);

  // Handle presentation mode keyboard
  useEffect(() => {
    if (isPresentationMode) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsPresentationMode(false);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setPresentationPage((prev) => Math.min(numPages || 1, prev + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setPresentationPage((prev) => Math.max(1, prev - 1));
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPresentationMode, numPages]);

  // Stable callbacks using refs
  const onDocumentLoadSuccess = useRef(({ numPages: loadedPages }: { numPages: number }) => {
    const currentUrl = urlRef.current;
    
    // Strict guard - prevent any duplicate processing
    if (documentLoadedRef.current === currentUrl || isProcessingRef.current) {
      return;
    }
    
    // Mark as processing immediately
    isProcessingRef.current = true;
    documentLoadedRef.current = currentUrl;
    
    // Cache the document metadata
    documentCacheRef.current.set(currentUrl, {
      numPages: loadedPages,
      timestamp: Date.now(),
    });
    
    // Defer state update to break synchronous cycle
    Promise.resolve().then(() => {
      // Double check URL hasn't changed
      if (urlRef.current === currentUrl && documentLoadedRef.current === currentUrl) {
        setNumPages(loadedPages);
        // Mark first page as loaded immediately for fast initial render
        setLoadedPages(new Set([1]));
        setVisiblePages(new Set([1, 2])); // Preload first 2 pages
        setLoading(false);
        setError(null);
      }
      isProcessingRef.current = false;
    });
  }).current;

  // Handle page load success
  const onPageLoadSuccess = useCallback((pageNum: number) => {
    setLoadedPages((prev) => {
      const newSet = new Set(prev);
      newSet.add(pageNum);
      return newSet;
    });
  }, []);

  const onDocumentLoadError = useRef((error: Error) => {
    const currentUrl = urlRef.current;
    
    // Strict guard - prevent any duplicate processing
    if (documentLoadedRef.current === currentUrl || isProcessingRef.current) {
      return;
    }
    
    // Mark as processing immediately
    isProcessingRef.current = true;
    documentLoadedRef.current = currentUrl;
    
    // Defer state update to break synchronous cycle
    Promise.resolve().then(() => {
      // Double check URL hasn't changed
      if (urlRef.current === currentUrl && documentLoadedRef.current === currentUrl) {
        setError(`Failed to load PDF: ${error.message || 'Please check if the URL is valid.'}`);
        setLoading(false);
      }
      isProcessingRef.current = false;
    });
  }).current;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Controls */}
      <div className="bg-white border-b border-gray-400 px-4 py-3 flex items-center justify-between h-[73px]">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 bg-white rounded-md shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
              aria-label="Open sidebar"
              title="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <Image
              src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png"
              alt="Nexuses Logo"
              width={160}
              height={48}
              className="object-contain"
              unoptimized
              priority
            />
            {!numPages && (
              <span className="text-xs text-gray-500 whitespace-nowrap">Loading...</span>
            )}
          </div>

          <span className="text-gray-700 hidden lg:block truncate">
            {numPages ? `${numPages} ${numPages === 1 ? 'Page' : 'Pages'}` : 'Loading...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton shareUrl={url} />
          <button
            onClick={() => {
              setIsPresentationMode(true);
              setPresentationPage(1);
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Open in presentation mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = url.split('/').pop() || 'document.pdf';
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              if (onDownload) {
                onDownload();
              }
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Download PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto flex flex-col items-center">
        {error ? (
          <div className="text-center text-red-600 p-8">
            <p className="mb-2">{error}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Try opening the link directly
            </a>
          </div>
        ) : (
          <div className="w-full space-y-4 p-4">
            {/* CRITICAL: Render first page in separate Document for INSTANT display */}
            {!firstPageLoaded && (
              <div className="w-full">
                <Document
                  key={`first-${url}`}
                  file={url}
                  onLoadError={onDocumentLoadError}
                  options={firstPageOptions}
                  loading={
                    <div className="w-full flex justify-center bg-white shadow-lg mb-4">
                      <div className="flex items-center justify-center h-[300px] text-gray-400">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
                          <p className="text-xs">Preparing your document...</p>
                          <p className="text-xs mt-1 text-gray-500">
                            Optimizing the first page for a faster viewing experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div className="w-full flex justify-center bg-white shadow-lg mb-4">
                    <Page
                      pageNumber={1}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={initialPageWidth}
                      scale={0.5} // Even lower scale (0.5) for absolute fastest render
                      onLoadSuccess={() => {
                        setFirstPageLoaded(true);
                        setLoading(false);
                        onPageLoadSuccess(1);
                        setLoadedPages(new Set([1]));
                      }}
                      loading={
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
                            <p className="text-xs">Rendering first page...</p>
                          </div>
                        </div>
                      }
                    />
                  </div>
                </Document>
              </div>
            )}
            
            {/* Full document Document - loads in background */}
            <Document
              key={`doc-${url}`}
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null} // Don't show loading, first page already visible
              error={
                <div className="p-8 text-red-600 text-center">
                  <p>Failed to load PDF.</p>
                  <p className="text-sm mt-2">URL: {url}</p>
                  <p className="text-sm mt-2">Please check if the URL is accessible and is a valid PDF file.</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-4 inline-block"
                  >
                    Try opening the link directly
                  </a>
                </div>
              }
              options={documentOptions}
            >
              {/* Show first page at full quality once document loads */}
              {numPages !== null && firstPageLoaded && (
                <div className="w-full flex justify-center bg-white shadow-lg mb-4">
                  <Page
                    pageNumber={1}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="w-full"
                    width={pageWidth}
                    scale={1.0}
                    onLoadSuccess={() => {
                      onPageLoadSuccess(1);
                    }}
                  />
                </div>
              )}
              
              {/* Render remaining pages with lazy loading */}
              {numPages && numPages > 1 && (
                Array.from(new Array(numPages - 1), (el, index) => {
                  const pageNum = index + 2; // Start from page 2
                  const shouldRender = visiblePages.has(pageNum);
                  
                  return (
                    <div
                      key={`page_${pageNum}`}
                      ref={(el) => registerPageRef(pageNum, el)}
                      data-page={pageNum}
                      className="w-full flex justify-center bg-white shadow-lg mb-4 min-h-[400px]"
                      style={{ minHeight: shouldRender ? 'auto' : '400px' }}
                    >
                      {shouldRender ? (
                        <Page
                          pageNumber={pageNum}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="w-full"
                          width={pageWidth}
                          onLoadSuccess={() => onPageLoadSuccess(pageNum)}
                          loading={
                            <div className="flex items-center justify-center h-[400px] text-gray-400">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                                <p className="text-sm">Loading page {pageNum}...</p>
                              </div>
                            </div>
                          }
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[400px] text-gray-400">
                          <div className="text-center">
                            <p className="text-sm">Page {pageNum}</p>
                            <p className="text-xs mt-1">Scroll to load</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </Document>
          </div>
        )}
      </div>

      {/* Presentation Modal */}
      {isPresentationMode && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setIsPresentationMode(false)}
        >
          <div 
            className="relative w-full h-full flex items-center justify-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsPresentationMode(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
              title="Close (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Arrows */}
            <button
              onClick={() => setPresentationPage((prev) => Math.max(1, prev - 1))}
              disabled={presentationPage <= 1}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed z-10 p-4"
              title="Previous (←)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => setPresentationPage((prev) => Math.min(numPages || 1, prev + 1))}
              disabled={!numPages || presentationPage >= numPages}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed z-10 p-4"
              title="Next (→)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Page Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded">
              Page {presentationPage} of {numPages || '--'}
            </div>

            {/* PDF Display */}
            <div className="max-w-full max-h-full flex items-center justify-center">
              {error ? (
                <div className="text-center text-white">
                  <p className="mb-2">{error}</p>
                </div>
              ) : (
                <Document
                  key={`presentation-${url}`}
                  file={url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="p-8 text-white">Loading PDF...</div>
                  }
                  error={
                    <div className="p-8 text-red-400">
                      Failed to load PDF.
                    </div>
                  }
                  options={documentOptions}
                >
                  <Page
                    pageNumber={presentationPage}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 200, 1400) : 1200}
                    className="shadow-2xl"
                  />
                </Document>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
