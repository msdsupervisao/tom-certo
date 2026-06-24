'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/app/components/ThemeToggle';
import PainelFavoritos from '@/app/components/PainelFavoritos';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function NavbarComFavoritos() {
  const [painelAberto, setPainelAberto] = useState(false);
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { user, carregando, entrarComEmail, sair } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await entrarComEmail(email);
    setEnviando(false);
    if (error) {
      setMensagem('Erro: ' + error);
    } else {
      setMensagem('✅ Link enviado! Verifique seu email.');
    }
  }

  async function entrarComGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

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

            {!carregando && (
              user ? (
                <button
                  onClick={() => sair()}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13 }}
                  title={user.email ?? ''}
                >
                  👤 Sair
                </button>
              ) : (
                <button
                  onClick={() => setModalLoginAberto(true)}
                  style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}
                >
                  Entrar
                </button>
              )
            )}

            <ThemeToggle />
          </div>
        </div>
      </nav>

      <PainelFavoritos aberto={painelAberto} onFechar={() => setPainelAberto(false)} />

      {modalLoginAberto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalLoginAberto(false)}
        >
          <div
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: 340, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Entrar no Tom Certo</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-dim)' }}>
              Entre com sua conta Google ou use seu email.
            </p>

            <button
              onClick={entrarComGoogle}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#fff', color: '#333', fontWeight: 700, fontSize: 14, border: '1px solid #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}
            >
              <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="Google" />
              Entrar com Google
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginBottom: 16 }}>ou</div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
              <button
                type="submit"
                disabled={enviando}
                style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: enviando ? 0.7 : 1 }}
              >
                {enviando ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>

            {mensagem && (
              <p style={{ marginTop: 16, fontSize: 13, color: mensagem.startsWith('✅') ? '#22c55e' : '#ef4444' }}>
                {mensagem}
              </p>
            )}

            <button
              onClick={() => setModalLoginAberto(false)}
              style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
