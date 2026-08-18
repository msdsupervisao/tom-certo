'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, User } from 'lucide-react';

/** Move o brilho radial (.tc-glow) para a posição do cursor sobre o item. */
function glowMove(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--gx', `${e.clientX - r.left}px`);
  el.style.setProperty('--gy', `${e.clientY - r.top}px`);
}

const TABS = [
  { href: '/', icon: Home, label: 'Início', id: 'home' },
  { href: '/#buscar', icon: Search, label: 'Buscar', id: 'buscar' },
  { href: '/favoritas', icon: Heart, label: 'Favoritas', id: 'favoritas' },
  { href: '/perfil', icon: User, label: 'Perfil', id: 'perfil' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname]);

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 860,
        display: 'flex',
        background: 'var(--tc-nav-bg)',
        borderTop: '0.5px solid var(--tc-nav-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 18px)',
        paddingTop: 10,
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const active =
          (tab.id === 'home' && pathname === '/' && hash !== '#buscar') ||
          (tab.id === 'buscar' && ((pathname === '/' && hash === '#buscar') || pathname === '/buscar' || pathname.startsWith('/musica'))) ||
          (tab.id === 'favoritas' && (pathname === '/favoritas' || pathname.startsWith('/favoritas/'))) ||
          (tab.id === 'perfil' && (pathname === '/perfil' || pathname.startsWith('/perfil/') || pathname.startsWith('/sobre')));
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onMouseMove={glowMove}
            className="tc-nav-item tc-glow tc-press"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              paddingTop: 4,
              paddingBottom: 4,
              color: active ? 'var(--tc-gold)' : 'var(--tc-nav-muted)',
              textDecoration: 'none',
            }}
          >
            <Icon
              size={22}
              strokeWidth={1.6}
              fill={tab.id === 'favoritas' && active ? 'currentColor' : 'none'}
            />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
