// app/components/ui/Navbar.tsx
'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface NavbarProps {
  acoes?: ReactNode; // slot à direita (ex: ThemeToggle, busca, avatar)
}

/**
 * Navbar base do design system. Logo sempre leva à home - é a convenção
 * que qualquer usuário de SaaS já espera, então não vale a pena inovar aqui.
 */
export default function Navbar({ acoes }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          <span className="text-[var(--color-primary)]">Tom</span> Certo
        </Link>
        <div className="flex items-center gap-2">{acoes}</div>
      </div>
    </nav>
  );
}
