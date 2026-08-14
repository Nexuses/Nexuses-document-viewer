'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import ContactFormModal from '@/components/ContactFormModal';
import ShareButton from '@/components/ShareButton';

const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

interface Asset {
  _id: string;
  title: string;
  link: string;
  fileUrl?: string;
  category?: 'document' | 'video';
  order?: number;
}

export default function AssetViewerShell({ activeAssetId }: { activeAssetId?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let sid = sessionStorage.getItem('sessionId');
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', sid);
      }
      return sid;
    }
    return '';
  });

  const [lastAssetViewTime, setLastAssetViewTime] = useState<number | null>(null);

  useEffect(() => {
    fetchAssets();

    const submitted = localStorage.getItem('formSubmitted');
    if (submitted === 'true') {
      setFormSubmitted(true);
    } else {
      const timer = setTimeout(() => {
        setShowForm(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!assets.length) return;

    const first = assets[0];
    const desired = activeAssetId ? assets.find((a) => a._id === activeAssetId) : first;

    if (!activeAssetId) {
      // Always keep a shareable route in the URL
      router.replace(`/assets/${first._id}`);
    } else if (!desired) {
      router.replace(`/assets/${first._id}`);
    }

    if (desired && desired._id !== selectedAsset?._id) {
      setSelectedAsset(desired);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssetId, assets]);

  // Resolve file URLs (optimized for speed)
  useEffect(() => {
    if (selectedAsset) {
      const fileUrl = selectedAsset.fileUrl || selectedAsset.link;

      if (!fileUrl) {
        setResolvedFileUrl(null);
        setVideoLoading(false);
        return;
      }

      if (selectedAsset.category === 'video') {
        setVideoLoading(true);
      }

      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        setResolvedFileUrl(fileUrl);
        return;
      }

      if (
        fileUrl.includes('.cloudfront.net') ||
        fileUrl.includes('.s3.') ||
        fileUrl.includes('.s3.amazonaws.com')
      ) {
        const absoluteUrl = fileUrl.startsWith('//') ? `https:${fileUrl}` : `https://${fileUrl}`;
        setResolvedFileUrl(absoluteUrl);
        return;
      }

      if (fileUrl.includes('/api/files/s3/')) {
        const key = decodeURIComponent(fileUrl.split('/api/files/s3/')[1]);
        if (key) {
          const bucketName = 'nexuses-asset';
          const region = 'us-east-1';
          const directUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
          setResolvedFileUrl(directUrl);

          if (typeof window !== 'undefined') {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = `https://${bucketName}.s3.${region}.amazonaws.com`;
            document.head.appendChild(link);

            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = directUrl;
            prefetchLink.as = selectedAsset?.category === 'video' ? 'video' : 'document';
            document.head.appendChild(prefetchLink);
          }

          return;
        }
      }

      const absoluteUrl = fileUrl.startsWith('/') ? `${window.location.origin}${fileUrl}` : fileUrl;
      setResolvedFileUrl(absoluteUrl);
    } else {
      setResolvedFileUrl(null);
      setVideoLoading(false);
    }
  }, [selectedAsset]);

  // Track page view when asset is selected
  useEffect(() => {
    if (selectedAsset && sessionId && formSubmitted) {
      if (lastAssetViewTime) {
        const timeSpent = Math.floor((Date.now() - lastAssetViewTime) / 1000);
        if (timeSpent > 0) {
          trackAnalytics('session_end', undefined, undefined, timeSpent);
        }
      }

      trackAnalytics('page_view', selectedAsset._id, selectedAsset.title);
      setLastAssetViewTime(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset?._id, sessionId, pathname, formSubmitted]);

  // Track session end when page is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastAssetViewTime && sessionId && formSubmitted) {
        const timeSpent = Math.floor((Date.now() - lastAssetViewTime) / 1000);
        if (timeSpent > 0) {
          const blob = new Blob(
            [
              JSON.stringify({
                sessionId,
                action: 'session_end',
                timeSpent,
                userAgent: navigator.userAgent,
              }),
            ],
            { type: 'application/json' }
          );
          navigator.sendBeacon('/api/analytics', blob);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (lastAssetViewTime && sessionId && formSubmitted) {
        const timeSpent = Math.floor((Date.now() - lastAssetViewTime) / 1000);
        if (timeSpent > 0) {
          trackAnalytics('session_end', undefined, undefined, timeSpent);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, formSubmitted]);

  const trackAnalytics = async (
    action: 'page_view' | 'download' | 'session_end',
    assetId?: string,
    assetTitle?: string,
    timeSpent?: number
  ) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action,
          assetId,
          assetTitle,
          timeSpent,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        }),
      });
    } catch (error) {
      console.error('Error tracking analytics:', error);
    }
  };

  const handleDownload = (asset: Asset) => {
    if (formSubmitted) {
      trackAnalytics('download', asset._id, asset.title);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        console.error('Error fetching assets:', data?.error || response.statusText);
        setAssets([]);
        return;
      }
      const normalized = data.map((a: Asset) => ({
        ...a,
        category: a.category || 'document',
      }));
      setAssets(normalized);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    setFormSubmitted(true);
    localStorage.setItem('formSubmitted', 'true');
    setShowForm(false);
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {showForm && !formSubmitted && (
        <ContactFormModal onClose={() => setShowForm(false)} onSubmit={handleFormSubmit} sessionId={sessionId} />
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-gray-200 flex flex-col border-r border-gray-400
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        {/* Logo */}
        <div className="px-6 py-3 border-b border-gray-400 h-[73px] flex items-center justify-between bg-gray-200">
          <a
            href="https://www.nexuses.in"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Image
              src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png"
              alt="Nexuses Logo"
              width={240}
              height={72}
              className="object-contain"
              unoptimized
            />
          </a>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-600">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="p-4 text-gray-600">No assets available</div>
          ) : (
            <div className="p-2">
              {assets.map((asset) => (
                <button
                  key={asset._id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    router.push(`/assets/${asset._id}`);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-colors flex items-center justify-between gap-3 ${
                    selectedAsset?._id === asset._id ? 'text-white' : 'text-gray-700 hover:bg-purple-200/60'
                  }`}
                  style={selectedAsset?._id === asset._id ? { backgroundColor: '#120C29' } : {}}
                >
                  <div className="font-medium truncate flex-1">{asset.title}</div>
                  {asset.category === 'video' ? (
                    <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 flex-shrink-0 opacity-70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 9h6M9 13h6M9 17h4"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Social Media Links - Fixed at Bottom */}
        <div className="border-t border-gray-400 p-4 bg-gray-200">
          <div className="flex items-center justify-center gap-8">
            <a
              href="https://www.linkedin.com/company/nexuses"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="LinkedIn"
            >
              <svg className="w-6 h-6" fill="#0077B5" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://x.com/nexusesofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="X (Twitter)"
            >
              <svg className="w-6 h-6" fill="#000000" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/nexusesin/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="Instagram"
            >
              <svg className="w-6 h-6" fill="#E4405F" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/nexuses/directory_intro"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="Facebook"
            >
              <svg className="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-gray-100 overflow-hidden relative">
        {selectedAsset ? (
          selectedAsset.category === 'video' ? (
            <div className="h-full w-full flex items-center justify-center bg-black relative pt-[73px] lg:pt-0">
              {/* Mobile header */}
              <div className="lg:hidden absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-[73px] bg-white border-b border-gray-400">
                <div className="flex items-center gap-2">
                  <Image
                    src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png"
                    alt="Nexuses Logo"
                    width={170}
                    height={50}
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ShareButton shareUrl={resolvedFileUrl || undefined} />
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 bg-white rounded-md shadow text-gray-700 hover:bg-gray-100"
                    aria-label="Open sidebar"
                    title="Open menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Desktop quick actions */}
              <div className="hidden lg:block absolute top-4 right-4 z-20">
                <div className="bg-white/90 backdrop-blur rounded-md shadow border border-gray-200">
                  <ShareButton shareUrl={resolvedFileUrl || undefined} />
                </div>
              </div>

              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Loading video...</p>
                  </div>
                </div>
              )}
              <video
                key={resolvedFileUrl || selectedAsset.fileUrl || selectedAsset.link}
                controls
                autoPlay
                preload="metadata"
                playsInline
                className="h-full w-full"
                src={resolvedFileUrl || selectedAsset.fileUrl || selectedAsset.link}
                onLoadStart={() => {
                  setVideoLoading(true);
                }}
                onLoadedMetadata={() => {
                  setVideoLoading(false);
                }}
                onCanPlay={() => {
                  setVideoLoading(false);
                }}
                onWaiting={() => {
                  setVideoLoading(true);
                }}
                onPlaying={() => {
                  setVideoLoading(false);
                }}
                onError={(e) => {
                  console.error('Video loading error:', e);
                  setVideoLoading(false);
                  const videoElement = e.currentTarget;
                  console.error('Video error details:', {
                    error: videoElement.error,
                    networkState: videoElement.networkState,
                    readyState: videoElement.readyState,
                    src: videoElement.src,
                  });
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : resolvedFileUrl ? (
            <PDFViewer url={resolvedFileUrl} onDownload={() => handleDownload(selectedAsset)} onOpenSidebar={() => setSidebarOpen(true)} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">Resolving file URL...</div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">Select a file to view</div>
        )}
      </div>
    </div>
  );
}


