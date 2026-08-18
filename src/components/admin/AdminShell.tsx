'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AdminChatbot from '@/components/admin/AdminChatbot';

const LOGO =
  'https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png';

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', exact: true },
  { href: '/admin/dashboard/smart-links', label: 'Smart Links' },
  { href: '/admin/dashboard/projects', label: 'Project & User Management' },
  { href: '/admin/dashboard/analytics', label: 'Analytics' },
  { href: '/admin/dashboard/submissions', label: 'Leads' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  if (typeof document !== 'undefined') {
    document.cookie = 'workspace=admin; path=/; SameSite=Lax';
  }
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (!data.authenticated) {
          router.push('/admin/login');
          return;
        }
        setReady(true);
      } catch {
        router.push('/admin/login');
      }
    };
    check();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50">
      <aside className="w-64 h-screen shrink-0 bg-[#120C29] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="bg-white rounded-xl px-3 py-3 flex justify-center">
            <Image src={LOGO} alt="Nexuses Logo" width={160} height={48} className="object-contain" unoptimized />
          </div>
          <p className="text-xs text-white/60 mt-3 tracking-wide uppercase">Master Admin</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white text-[#120C29]' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#120C29] hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 h-screen overflow-y-auto text-gray-900 bg-gray-50">{children}</main>
      <AdminChatbot />
    </div>
  );
}
