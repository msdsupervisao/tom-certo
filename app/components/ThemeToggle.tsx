// app/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';

const CHAVE_TEMA = 'tom-certo:tema';

export default function ThemeToggle() {
  const [tema, setTema] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_TEMA);
    const proximo = salvo === 'light' || salvo === 'dark' ? salvo : 'dark';
    setTema(proximo);
    document.documentElement.setAttribute('data-theme', proximo);
  }, []);

  function alternar() {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    document.documentElement.setAttribute('data-theme', novoTema);
    window.localStorage.setItem(CHAVE_TEMA, novoTema);
  }

  return (
    <button
      onClick={alternar}
      aria-label="Alternar tema claro/escuro"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel text-base"
    >
      {tema === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
