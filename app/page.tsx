'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import {
  obterTomMaisFrequente, obterPrecisaoMedia, obterTotalAnalises,
  obterUltimaAnalise, obterMusicasVisitadas, MusicaVisitada
} from '@/lib/historico-local';
import { salvarENotificar, escutarStorage } from '@/lib/storage-events';
import Afinador from '@/app/components/Afinador';
import { Mic, SlidersHorizontal, Search, Music, ChevronRight, Heart } from 'lucide-react';

const CACHE_CAPAS: Record<string, string> = {};

interface FavItem {
  id: string;
  titulo?: string;
  artista?: string;
  slug: string;
  isMock: boolean;
}

export default function Home() {
  const router   = useRouter();
  const pathname = usePathname();

  const [afinadorAberto, setAfinadorAberto]         = useState(false);
  const [perfil, setPerfil]                         = useState<{ tom: string | null; precisao: number | null; total: number } | null>(null);
  const [capas, setCapas]                           = useState<Record<string, string>>({});
  const [favoritos, setFavoritos]                   = useState<string[]>([]);
  const [favoritosCompletos, setFavoritosCompletos] = useState<FavItem[]>([]);
  const [visitadas, setVisitadas]                   = useState<MusicaVisitada[]>([]);
  const [query, setQuery]                           = useState('');

  /* ── Recarrega dados do localStorage ── */
  function recarregarDados() {
    setPerfil({
      tom:      obterTomMaisFrequente(),
      precisao: obterPrecisaoMedia(),
      total:    obterTotalAnalises(),
    });
    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      if (!raw) { setFavoritos([]); setFavoritosCompletos([]); return; }
      const parsed = JSON.parse(raw);
      const ids    = parsed.map((x: any) => typeof x === 'string' ? x : x.id);
      setFavoritos(ids);
      const itens = parsed.map((x: any) => {
        const id       = typeof x === 'string' ? x : x.id;
        const mockSong = buscarMusicaPorId(id);
        if (mockSong) return { id, titulo: mockSong.titulo, artista: mockSong.artista, slug: id, isMock: true };
        return { id, titulo: x.titulo, artista: x.artista, slug: id, isMock: false };
      });
      setFavoritosCompletos(itens);
      setVisitadas(obterMusicasVisitadas(12));
    } catch { setFavoritos([]); }
  }

  useEffect(() => {
    recarregarDados();
    return escutarStorage(recarregarDados);
  }, [pathname]);

  /* ── Busca capas no Spotify ── */
  useEffect(() => {
    const todas = [
      ...visitadas.map(v => ({ id: v.id, titulo: v.titulo, artista: v.artista })),
      ...favoritosCompletos.map(f => ({ id: f.id, titulo: f.titulo || '', artista: f.artista || '' })),
    ];
    todas.forEach(item => {
      if (!item.titulo) return;
      if (CACHE_CAPAS[item.id]) { setCapas(prev => ({ ...prev, [item.id]: CACHE_CAPAS[item.id] })); return; }
      fetch(`/api/spotify?q=${encodeURIComponent(item.titulo + ' ' + item.artista)}`)
        .then(r => r.json())
        .then(d => { if (d.imagem) { CACHE_CAPAS[item.id] = d.imagem; setCapas(prev => ({ ...prev, [item.id]: d.imagem })); } })
        .catch(() => {});
    });
  }, [visitadas, favoritosCompletos]);

  /* ── Toggle favorito ── */
  function toggleFav(id: string, titulo?: string, artista?: string) {
    try {
      const raw    = localStorage.getItem('tom-certo:favoritos');
      const atual: Array<{ id: string; titulo?: string; artista?: string }> = raw ? JSON.parse(raw) : [];
      const norm   = atual.map((x: any) => typeof x === 'string' ? { id: x } : x);
      const existe = norm.some((x: any) => x.id === id);
      const nova   = existe ? norm.filter((x: any) => x.id !== id) : [...norm, { id, titulo, artista }];
      salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
      setFavoritos(nova.map((x: any) => x.id));
    } catch {}
  }

  const temTom     = perfil && perfil.total > 0 && perfil.tom;
  const ultimaVisitada = visitadas[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg, #0D0D0D)', color: 'var(--tc-txt, #F0EDE6)', fontFamily: 'var(--font-ui, Inter, sans-serif)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display, "Playfair Display", serif)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold, #D4A017)', letterSpacing: -0.5 }}>
              Tom<span style={{ color: 'var(--tc-txt3, #5A5450)', fontWeight: 500 }}>Certo</span>
            </span>
            <p style={{ fontSize: 11, color: 'var(--tc-txt3, #5A5450)', marginTop: 2 }}>Boa tarde</p>
          </div>
          <Link href="/perfil" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-gold, #D4A017)', fontSize: 12, fontWeight: 600 }}>
            M
          </Link>
        </div>
      </div>

      {/* ── Scroll ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}>

        {/* ── BENTO GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 14 }}>

          {/* Hero — Tom vocal (full width) */}
          <div
            onClick={() => router.push('/buscar')}
            style={{ gridColumn: '1 / -1', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 18, padding: 16, cursor: 'pointer' }}
          >
            <p style={{ fontSize: 10, color: 'var(--tc-gold,#D4A017)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mic size={12} /> Tom vocal detectado
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display,"Playfair Display",serif)', fontSize: 44, fontWeight: 700, color: 'var(--tc-txt,#F0EDE6)', lineHeight: 1, letterSpacing: -1 }}>
                  {temTom ? perfil!.tom : '—'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--tc-txt2,#A09890)', marginTop: 4 }}>
                  {temTom ? `${perfil!.total} análises · ${perfil!.precisao}% precisão` : 'Cante para detectar seu tom'}
                </p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--tc-gold,#D4A017)', color: '#0D0D0D', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 30 }}>
                <Music size={13} /> Buscar cifras
              </span>
            </div>
          </div>

          {/* Detectar tom */}
          <div
            onClick={() => router.push('/musica')}
            style={{ background: 'var(--tc-s1,#1A1A1A)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 16, cursor: 'pointer' }}
          >
            <Mic size={26} style={{ color: 'var(--tc-gold,#D4A017)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-txt,#F0EDE6)' }}>Detectar tom</p>
            <p style={{ fontSize: 11, color: 'var(--tc-txt2,#A09890)', marginTop: 3 }}>Via microfone</p>
          </div>

          {/* Afinador */}
          <div
            onClick={() => setAfinadorAberto(true)}
            style={{ background: 'var(--tc-s1,#1A1A1A)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 16, cursor: 'pointer' }}
          >
            <SlidersHorizontal size={26} style={{ color: 'var(--tc-gold,#D4A017)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-txt,#F0EDE6)' }}>Afinador</p>
            <p style={{ fontSize: 11, color: 'var(--tc-txt2,#A09890)', marginTop: 3 }}>Tempo real</p>
          </div>

          {/* Stats */}
          <div style={{ background: 'var(--tc-s1,#1A1A1A)', border: '0.5px solid rgba(212,160,23,0.2)', borderRadius: 18, padding: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--tc-gold,#D4A017)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Suas stats</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display,"Playfair Display",serif)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold,#D4A017)' }}>{favoritosCompletos.length}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt3,#5A5450)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>favoritas</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display,"Playfair Display",serif)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold,#D4A017)' }}>{perfil?.total ?? 0}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt3,#5A5450)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>análises</p>
              </div>
            </div>
          </div>

          {/* Última sessão */}
          <div
            onClick={() => ultimaVisitada && router.push(`/musica/${ultimaVisitada.id}`)}
            style={{ background: 'rgba(212,160,23,0.06)', border: '0.5px solid rgba(212,160,23,0.2)', borderRadius: 18, padding: 16, cursor: ultimaVisitada ? 'pointer' : 'default' }}
          >
            <p style={{ fontSize: 10, color: 'var(--tc-gold,#D4A017)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Última sessão</p>
            {ultimaVisitada ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--tc-txt,#F0EDE6)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ultimaVisitada.titulo}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt2,#A09890)', marginTop: 2 }}>{ultimaVisitada.artista}</p>
              </>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--tc-txt3,#5A5450)' }}>Nenhuma ainda</p>
            )}
          </div>
        </div>

        {/* ── Busca rápida ── */}
        <div
          onClick={() => router.push('/buscar')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--tc-s1,#1A1A1A)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, cursor: 'pointer' }}
        >
          <Search size={18} style={{ color: 'var(--tc-txt3,#5A5450)' }} />
          <span style={{ fontSize: 14, color: 'var(--tc-txt3,#5A5450)' }}>Buscar música ou artista...</span>
        </div>

        {/* ── Favoritas ── */}
        {favoritosCompletos.length > 0 && (
          <>
            <StripLabel label="Favoritas" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {favoritosCompletos.slice(0, 4).map(f => {
                const titulo  = f.titulo  || f.id.split('/')[1]?.replace(/-/g, ' ') || 'Música';
                const artista = f.artista || f.id.split('/')[0]?.replace(/-/g, ' ') || 'Artista';
                const href    = f.isMock  ? `/musica/${f.id}` : `/musica/${f.slug}`;
                return (
                  <MusicaRow
                    key={f.id}
                    href={href}
                    titulo={titulo}
                    artista={artista}
                    badge=""
                    transposed={false}
                    rightSlot={
                      <button
                        onClick={e => { e.preventDefault(); toggleFav(f.id, f.titulo, f.artista); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-gold,#D4A017)', padding: 4 }}
                      >
                        <Heart size={14} fill="currentColor" />
                      </button>
                    }
                  />
                );
              })}
              {favoritosCompletos.length > 4 && (
                <Link href="/favoritas" style={{ fontSize: 12, color: 'var(--tc-gold,#D4A017)', textAlign: 'center', padding: '6px 0', textDecoration: 'none' }}>
                  Ver todas ({favoritosCompletos.length})
                </Link>
              )}
            </div>
          </>
        )}

        {/* ── Recentes ── */}
        {visitadas.length > 0 && (
          <>
            <StripLabel label="Acessadas recentemente" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visitadas.slice(0, 6).map(v => (
                <MusicaRow
                  key={v.id}
                  href={`/musica/${v.id}`}
                  titulo={v.titulo}
                  artista={v.artista}
                  badge=""
                  transposed={false}
                  rightSlot={
                    <button
                      onClick={e => { e.preventDefault(); toggleFav(v.id, v.titulo, v.artista); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: favoritos.includes(v.id) ? 'var(--tc-gold,#D4A017)' : 'var(--tc-txt3,#5A5450)', padding: 4 }}
                    >
                      <Heart size={14} fill={favoritos.includes(v.id) ? 'currentColor' : 'none'} />
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {visitadas.length === 0 && favoritosCompletos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--tc-s1,#1A1A1A)', borderRadius: 20, border: '0.5px solid rgba(255,255,255,0.07)' }}>
            <Music size={48} style={{ color: 'var(--tc-txt3,#5A5450)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma música ainda</p>
            <p style={{ color: 'var(--tc-txt2,#A09890)', fontSize: 13, lineHeight: 1.6 }}>Busque uma música acima para começar.</p>
          </div>
        )}

      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, display: 'flex', background: 'rgba(20,20,20,0.97)', borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom, 18px)', paddingTop: 10, zIndex: 100 }}>
        {[
          { href: '/',          icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>, label: 'Início',    active: true  },
          { href: '/buscar',    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, label: 'Buscar',    active: false },
          { href: '/favoritas', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, label: 'Favoritas', active: false },
          { href: '/perfil',    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Perfil',    active: false },
        ].map(tab => (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tab.active ? 'var(--tc-gold,#D4A017)' : 'var(--tc-txt3,#5A5450)', textDecoration: 'none' }}>
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
          </Link>
        ))}
      </nav>

      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}

/* ── Sub-componentes ── */
function StripLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize: 10, color: 'var(--tc-txt3,#5A5450)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function MusicaRow({ href, titulo, artista, badge, transposed, rightSlot }: {
  href: string; titulo: string; artista: string;
  badge: string; transposed: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--tc-s1,#1A1A1A)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, textDecoration: 'none' }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tc-gold,#D4A017)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tc-txt,#F0EDE6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</p>
        <p style={{ fontSize: 11, color: 'var(--tc-txt2,#A09890)' }}>{artista}</p>
      </div>
      {badge && (
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tc-gold,#D4A017)', background: 'rgba(212,160,23,0.12)', border: '0.5px solid rgba(212,160,23,0.3)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{badge}</span>
      )}
      {rightSlot || <ChevronRight size={14} style={{ color: 'var(--tc-txt3,#5A5450)', flexShrink: 0 }} />}
    </Link>
  );
}
