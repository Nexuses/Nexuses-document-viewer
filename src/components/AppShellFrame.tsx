'use client';

import { ReactNode, useEffect } from 'react';

export default function AppShellFrame({
  title,
  open,
  onOpen,
  onClose,
  pathname,
  sidebar,
  children,
  extra,
}: {
  title: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  pathname: string;
  sidebar: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
}) {
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50 max-md:flex-col">
      <header className="hidden max-md:flex shrink-0 h-14 items-center gap-3 px-3 bg-[#120C29] text-white">
        <button
          type="button"
          onClick={onOpen}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-sm font-semibold truncate">{title}</p>
      </header>

      {open ? (
        <button
          type="button"
          className="hidden max-md:block fixed inset-0 z-[60] bg-black/40"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`w-64 h-screen shrink-0 bg-[#120C29] text-white flex flex-col max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[70] max-md:transition-transform ${
          open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        <div className="hidden max-md:flex items-center justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        {sidebar}
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto text-gray-900 bg-gray-50 max-md:h-auto max-md:min-h-0">
        {children}
      </main>
      {extra}
    </div>
  );
}
