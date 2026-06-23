// app/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [tema, setTema] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const salvo = window.localStorage.getItem('tom-certo-tema');
    if (salvo === 'light' || salvo === 'dark') {
      setTema(salvo);
      document.documentElement.setAttribute('data-theme', salvo);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function alternar() {
    const novoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(novoTema);
    document.documentElement.setAttribute('data-theme', novoTema);
    window.localStorage.setItem('tom-certo-tema', novoTema);
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
