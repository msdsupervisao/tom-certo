'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { obterTomMaisFrequente, obterTotalAnalises, obterMusicasVisitadas } from '@/lib/historico-local';
import { SlidersHorizontal, Moon, HelpCircle, LogOut, ChevronRight, Music } from 'lucide-react';

export default function PerfilPage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  const tom = obterTomMaisFrequente();
  const totalAnalises = obterTotalAnalises();
  const totalVisitadas = obterMusicasVisitadas(100).length;

  const nome = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Visitante';
  const email = user?.email || 'Não logado';
  const iniciais = nome.slice(0, 1).toUpperCase();

  async function sair() {
    setSaindo(true);
    await supabase.auth.signOut();
    router.push('/');
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

        <Divider label="Conta" />
        <MenuItem icon={<HelpCircle size={18} />} label="Ajuda" onClick={() => {}} />
        {user ? (
          <MenuItem icon={<LogOut size={18} />} label={saindo ? 'Saindo...' : 'Sair da conta'} onClick={sair} danger />
        ) : (
          <MenuItem icon={<LogOut size={18} />} label="Entrar" onClick={() => router.push('/')} />
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 860, display: 'flex', background: 'rgba(20,20,20,0.97)', borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom, 18px)', paddingTop: 10, zIndex: 100 }}>
        {[
          { href: '/',          icon: 'home',   label: 'Início',    active: false },
          { href: '/buscar',    icon: 'search', label: 'Buscar',    active: false },
          { href: '/favoritas', icon: 'heart',  label: 'Favoritas', active: false },
          { href: '/perfil',    icon: 'user',   label: 'Perfil',    active: true  },
        ].map(tab => (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tab.active ? 'var(--tc-gold)' : 'var(--tc-txt3)', textDecoration: 'none' }}>
            {tab.icon === 'home'   && <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>}
            {tab.icon === 'search' && <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
            {tab.icon === 'heart'  && <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
            {tab.icon === 'user'   && <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
          </Link>
        ))}
      </nav>
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
