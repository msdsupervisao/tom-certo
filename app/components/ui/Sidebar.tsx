// app/components/ui/Sidebar.tsx
'use client';

import { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
  largura?: 'sm' | 'md'; // sm=280px, md=340px
}

/**
 * Sidebar base, pensada para conteúdo de contexto/controles que deve
 * permanecer visível enquanto a área principal rola (ex: controles de
 * gravação na tela da música, enquanto a cifra rola ao lado).
 * Só aparece em telas grandes (lg+) - em mobile o conteúdo deve empilhar
 * acima da área principal, não desaparecer.
 */
export default function Sidebar({ children, largura = 'md' }: SidebarProps) {
  const larguraPx = largura === 'sm' ? 'lg:w-[280px]' : 'lg:w-[340px]';

  return (
    <aside className={`lg:sticky lg:top-24 lg:self-start ${larguraPx} lg:shrink-0`}>
      {children}
    </aside>
  );
}
