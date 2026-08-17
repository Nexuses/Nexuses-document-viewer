'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

type PortalUser = {
  name: string;
  username: string;
  projectName: string;
  projectSlug: string;
  logoUrl?: string;
};

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/project-check')
      .then(async (r) => {
        const data = await r.json();
        if (!data.authenticated) {
          router.replace('/login');
          return;
        }
        setUser(data.user);
        setReady(true);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/project-logout', { method: 'POST' });
    router.push('/login');
  };

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading...
      </div>
    );
  }

  const nav = [
    { href: '/portal/smart-links', label: 'Smart Links' },
  ];

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50">
      <aside className="w-64 h-screen shrink-0 bg-[#120C29] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="bg-white rounded-xl px-3 py-3 flex justify-center">
            {user.logoUrl ? (
              <img src={user.logoUrl} alt={user.projectName} className="h-12 object-contain" />
            ) : (
              <Image
                src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/Nexuses-full-logo-dark_8d412ea3-bf11-4fc6-af9c-bee7e51ef494.png"
                alt="Nexuses Logo"
                width={160}
                height={48}
                className="object-contain"
                unoptimized
              />
            )}
          </div>
          <p className="text-sm font-semibold mt-3 truncate">{user.projectName}</p>
          <p className="text-xs text-white/60 mt-1 truncate">Project Admin · {user.username}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
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
    </div>
  );
}
