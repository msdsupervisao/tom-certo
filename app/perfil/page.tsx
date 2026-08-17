'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { obterTomMaisFrequente, obterTotalAnalises, obterMusicasVisitadas } from '@/lib/historico-local';
import { SlidersHorizontal, LogOut, ChevronRight, Music, Sun, Moon } from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';

export default function PerfilPage() {
  const { user, sair } = useAuth();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [tema, setTema]     = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const t = localStorage.getItem('tom-certo:tema') as 'dark' | 'light' | null;
      if (t) setTema(t);
    } catch {}
  }, []);

  const tom            = obterTomMaisFrequente();
  const totalAnalises  = obterTotalAnalises();
  const totalVisitadas = obterMusicasVisitadas(100).length;

  const nome     = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Visitante';
  const email    = user?.email || 'Não logado';
  const iniciais = nome.slice(0, 1).toUpperCase();

  async function handleSair() {
    setSaindo(true);
    await sair();
    router.push('/');
  }

  function alternarTema() {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    document.documentElement.setAttribute('data-theme', novo);
    try { localStorage.setItem('tom-certo:tema', novo); } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>

      {/* Hero do perfil */}
      <div style={{ background: 'var(--tc-s1)', borderBottom: '0.5px solid var(--tc-border)', padding: '22px 16px 18px', flexShrink: 0 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(212,160,23,0.12)', border: '2px solid rgba(212,160,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-gold)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          {iniciais}
        </div>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--tc-txt)' }}>{nome}</p>
        <p style={{ fontSize: 11, color: 'var(--tc-txt2)', marginTop: 2 }}>{email}</p>

        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <StatPill num={String(totalVisitadas)} label="Músicas" />
          <StatPill num={tom || '—'} label="Meu tom" />
          <StatPill num={String(totalAnalises)} label="Análises" />
        </div>
      </div>

      {/* Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px' }}>

        <Divider label="Configurações" />
        <MenuItem icon={<SlidersHorizontal size={18} />} label="Afinador" onClick={() => router.push('/afinador')} />
        <MenuItem icon={<Music size={18} />} label="Minhas favoritas" onClick={() => router.push('/favoritas')} />

        {/* Toggle de tema */}
        <div
          onClick={alternarTema}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 11, marginBottom: 7, cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--tc-border)')}
        >
          <span style={{ color: 'var(--tc-txt2)', flexShrink: 0 }}>
            {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--tc-txt)' }}>
            {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </span>
          {/* Toggle pill */}
          <div style={{ width: 42, height: 24, borderRadius: 12, background: tema === 'dark' ? 'var(--tc-s2)' : 'var(--tc-gold)', border: '0.5px solid var(--tc-border)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: tema === 'dark' ? 3 : 19, width: 18, height: 18, borderRadius: '50%', background: tema === 'dark' ? 'var(--tc-txt3)' : '#fff', transition: 'left 0.25s' }} />
          </div>
        </div>

        <Divider label="Conta" />
        {user ? (
          <MenuItem icon={<LogOut size={18} />} label={saindo ? 'Saindo...' : 'Sair da conta'} onClick={handleSair} danger />
        ) : (
          <MenuItem icon={<LogOut size={18} />} label="Entrar" onClick={() => router.push('/login')} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function StatPill({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--tc-gold)' }}>{num}</p>
      <p style={{ fontSize: 10, color: 'var(--tc-txt3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
      <span style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 8px' }}>{label}</span>
      {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 11, marginBottom: 7, cursor: 'pointer', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = danger ? 'rgba(226,75,74,0.3)' : 'rgba(212,160,23,0.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--tc-border)')}
    >
      <span style={{ color: danger ? 'var(--tc-danger)' : 'var(--tc-txt2)', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: danger ? 'var(--tc-danger)' : 'var(--tc-txt)' }}>{label}</span>
      <ChevronRight size={14} style={{ color: 'var(--tc-txt3)', flexShrink: 0 }} />
    </div>
  );
}
