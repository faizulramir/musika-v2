'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { AuthForm } from './AuthForm';
import { AuthProvider } from './AuthProvider';
import { useGame } from '@/lib/store';
import { disconnectSocket } from '@/lib/socket';

function Nav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Header({ user, onLogout }: { user: { username: string; isAdmin?: boolean }; onLogout: () => void }) {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/library', label: 'Library' },
    ...(user.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/70 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <Nav items={items} />
        <div className="flex items-center gap-3 shrink-0">
          <span className="chip bg-white/5 text-zinc-300">🎮 {user.username}</span>
          <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

function NoticeBanner() {
  const notice = useGame((s) => s.notice);
  const setNotice = useGame((s) => s.setNotice);
  if (!notice) return null;
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
      <span className="text-lg leading-none">⚠️</span>
      <p className="flex-1 text-sm">{notice}</p>
      <button className="text-amber-300/80 hover:text-amber-100 text-lg leading-none" onClick={() => setNotice(null)}>
        ✕
      </button>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const user = useGame((s) => s.user);
  const authLoading = useGame((s) => s.authLoading);
  const setAuth = useGame((s) => s.setAuth);
  const resetMatch = useGame((s) => s.resetMatch);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) return <AuthForm />;

  function logout() {
    disconnectSocket();
    resetMatch();
    setAuth(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={logout} />
      <div className="w-full max-w-6xl mx-auto px-4 pt-4">
        <NoticeBanner />
      </div>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 -mt-1">{children}</main>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
