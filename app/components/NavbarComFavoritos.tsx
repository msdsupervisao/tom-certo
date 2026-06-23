'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/app/components/ThemeToggle';
import PainelFavoritos from '@/app/components/PainelFavoritos';

export default function NavbarComFavoritos() {
  const [painelAberto, setPainelAberto] = useState(false);

  return (
    <>
      <nav className="no-print sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <span style={{ fontSize: 22 }}>🎵</span>
            <span><span className="text-[var(--color-primary)]">Tom</span> Certo</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPainelAberto(true)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: 14, fontWeight: 600 }}
            >
              ❤️ Favoritas
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <PainelFavoritos aberto={painelAberto} onFechar={() => setPainelAberto(false)} />
    </>
  );
}
