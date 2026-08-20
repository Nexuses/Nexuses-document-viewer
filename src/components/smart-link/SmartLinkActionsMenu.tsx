'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  slug: string;
  linkId: string;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (slug: string) => void;
}

export default function SmartLinkActionsMenu({ slug, linkId, onDuplicate, onDelete, onCopyLink }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const viewUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/s/${slug}` : `/s/${slug}`;

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const gutter = 8;
    const left = Math.min(
      Math.max(gutter, rect.right - menuWidth),
      window.innerWidth - menuWidth - gutter
    );

    setMenuStyle({
      top: rect.bottom + 6,
      left,
    });
  };

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = rootRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) setOpen(false);
    };

    const reposition = () => updateMenuPosition();

    document.addEventListener('mousedown', close);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Open actions menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-100 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ top: menuStyle.top, left: menuStyle.left }}
          >
            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              View
            </a>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={() => run(() => onDuplicate(linkId))}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => run(() => onDelete(linkId))}
            >
              Delete
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              onClick={() => run(() => onCopyLink(slug))}
            >
              Copy Link
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
