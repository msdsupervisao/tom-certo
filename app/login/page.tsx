'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, carregando, entrarComEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrarComGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    const { error } = await entrarComEmail(email);
    setEnviando(false);
    if (error) {
      setMensagem(`Erro: ${error}`);
    } else {
      setMensagem('✅ Link enviado! Verifique seu email.');
    }
  }

  if (carregando) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>
        <div>Carregando...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>
        <div style={{ padding: '24px 16px' }}>
          <button
            onClick={() => router.push('/perfil')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--tc-gold)', cursor: 'pointer', fontSize: 14, marginBottom: 20 }}
          >
            <ArrowLeft size={18} /> Voltar ao perfil
          </button>
          <div style={{ background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 18, padding: 24 }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Você já está conectado</p>
            <p style={{ color: 'var(--tc-txt2)', marginBottom: 24 }}>Acesse seu perfil para ver seus favoritos e histórico.</p>
            <Link href="/perfil" style={{ display: 'inline-flex', padding: '12px 18px', borderRadius: 12, background: 'var(--tc-gold)', color: '#0D0D0D', fontWeight: 700, textDecoration: 'none' }}>
              Ir para perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>
      <div style={{ padding: '24px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--tc-gold)', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={18} /> Voltar
        </Link>
      </div>

      <div style={{ flex: 1, padding: '0 16px 80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 18, padding: 28, boxShadow: '0 18px 50px rgba(0,0,0,0.18)' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>Entrar no Tom Certo</h1>
          <p style={{ marginTop: 8, color: 'var(--tc-txt3)', fontSize: 14, lineHeight: 1.6 }}>Use Google ou seu email para sincronizar favoritos e continuar de onde parou.</p>

          <button
            onClick={entrarComGoogle}
            style={{ width: '100%', marginTop: 24, padding: '12px 16px', borderRadius: 12, background: '#fff', color: '#111', fontWeight: 700, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            Entrar com Google
          </button>

          <div style={{ textAlign: 'center', color: 'var(--tc-txt3)', fontSize: 12, margin: '18px 0' }}>ou</div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Seu email"
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--tc-border)', background: 'var(--tc-bg)', color: 'var(--tc-txt)', fontSize: 14, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={enviando}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none', background: 'var(--tc-gold)', color: '#0D0D0D', fontWeight: 700, cursor: 'pointer', opacity: enviando ? 0.7 : 1 }}
            >
              {enviando ? 'Enviando...' : 'Enviar link mágico'}
            </button>
          </form>

          {mensagem && (
            <p style={{ marginTop: 16, color: mensagem.startsWith('✅') ? '#22c55e' : '#ef4444', fontSize: 13 }}>{mensagem}</p>
          )}

          <p style={{ marginTop: 16, color: 'var(--tc-txt3)', fontSize: 12, lineHeight: 1.6 }}>
            Ao entrar, seus favoritos e histórico ficam sincronizados entre dispositivos.
          </p>
        </div>
      </div>
    </div>
  );
}
