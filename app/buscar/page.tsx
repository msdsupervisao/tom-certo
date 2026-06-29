'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

interface ResultadoBusca {
  titulo: string;
  artista: string;
  url: string;
  slug: string;
}

export default function BuscarPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); setBuscou(false); return; }
    setCarregando(true);
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data.resultados || []);
      setBuscou(true);
    } catch {
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => buscar(val), 400);
  }

  function limpar() {
    setQuery('');
    setResultados([]);
    setBuscou(false);
  }

  function handleSelect(r: ResultadoBusca) {
    try {
      const historico = JSON.parse(localStorage.getItem('historico_musicas') || '[]');
      const nova = { id: r.slug, titulo: r.titulo, artista: r.artista, url: r.url, acessadaEm: new Date().toISOString() };
      const atualizado = [nova, ...historico.filter((m: any) => m.id !== nova.id)].slice(0, 20);
      localStorage.setItem('historico_musicas', JSON.stringify(atualizado));
    } catch {}
    router.push(`/musica/${r.slug}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)', letterSpacing: -0.5 }}>
          Tom<span style={{ color: 'var(--tc-txt3)', fontWeight: 500 }}>Certo</span>
        </span>
      </div>

      {/* Barra de busca */}
      <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, padding: '10px 14px' }}>
          <Search size={18} style={{ color: 'var(--tc-txt3)', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Nome da música ou artista..."
            style={{ background: 'transparent', border: 'none', color: 'var(--tc-txt)', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none', flex: 1 }}
          />
          {carregando && (
            <div style={{ width: 16, height: 16, border: '2px solid var(--tc-border)', borderTopColor: 'var(--tc-gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          )}
          {query && !carregando && (
            <button onClick={limpar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt3)', display: 'flex', padding: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}>
        {resultados.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
              {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
              <span style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 8px' }}>{resultados.length} resultados</span>
              {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resultados.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--tc-border)')}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tc-gold)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo}</p>
                    <p style={{ fontSize: 11, color: 'var(--tc-txt2)' }}>{r.artista}</p>
                  </div>
                  <svg width="14" height="14" fill="none" stroke="var(--tc-txt3)" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </>
        )}

        {buscou && resultados.length === 0 && !carregando && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--tc-s1)', borderRadius: 20, border: '0.5px solid var(--tc-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma música encontrada</p>
            <p style={{ color: 'var(--tc-txt2)', fontSize: 13 }}>Tente buscar por outro nome ou artista.</p>
          </div>
        )}

        {!buscou && !carregando && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Search size={48} style={{ color: 'var(--tc-txt3)', marginBottom: 12 }} />
            <p style={{ color: 'var(--tc-txt2)', fontSize: 14 }}>Digite o nome de uma música ou artista</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 860, display: 'flex', background: 'rgba(20,20,20,0.97)', borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom, 18px)', paddingTop: 10, zIndex: 100 }}>
        {[
          { href: '/',          icon: 'home',   label: 'Início',    active: false },
          { href: '/buscar',    icon: 'search', label: 'Buscar',    active: true  },
          { href: '/favoritas', icon: 'heart',  label: 'Favoritas', active: false },
          { href: '/perfil',    icon: 'user',   label: 'Perfil',    active: false },
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
