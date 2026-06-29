'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, User } from 'lucide-react';

const TABS = [
  { href: '/', icon: Home, label: 'Início' },
  { href: '/buscar', icon: Search, label: 'Buscar' },
  { href: '/favoritas', icon: Heart, label: 'Favoritas' },
  { href: '/perfil', icon: User, label: 'Perfil' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

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
        background: 'rgba(20,20,20,0.97)',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 18px)',
        paddingTop: 10,
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: active ? 'var(--tc-gold)' : 'var(--tc-txt3)',
              textDecoration: 'none',
            }}
          >
            <Icon
              size={22}
              strokeWidth={1.6}
              fill={tab.href === '/favoritas' && active ? 'currentColor' : 'none'}
            />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
