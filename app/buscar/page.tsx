'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Search, X } from 'lucide-react';
import { registrarVisita } from '@/lib/historico-local';
import BottomNav from '@/app/components/BottomNav';

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
  const [erroBusca, setErroBusca] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const buscar = useCallback(async (q: string) => {
    const termo = q.trim();
    if (termo.length < 2) {
      setResultados([]);
      setBuscou(false);
      setErroBusca('');
      return;
    }
    setCarregando(true);
    setErroBusca('');
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(termo)}`);
      if (!res.ok) throw new Error('Busca indisponível');
      const data = await res.json();
      setResultados(Array.isArray(data.resultados) ? data.resultados : []);
      setBuscou(true);
    } catch {
      setResultados([]);
      setErroBusca('Não foi possível buscar agora. Verifique sua conexão e tente novamente.');
      setBuscou(true);
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
    setErroBusca('');
  }

  function handleSelect(r: ResultadoBusca) {
    // Sem cifra real no CifraClub: abre a musica externamente, sem
    // registrar no historico (nao ha pagina interna pra revisitar).
    if (r.url && !r.url.includes('cifraclub.com.br')) {
      window.open(r.url, '_blank')
      return
    }
    registrarVisita(r.slug, r.titulo, r.artista);
    router.push(`/musica/${r.slug}`)
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

        {erroBusca && !carregando && (
          <div style={{ textAlign: 'center', padding: '36px 24px', background: 'var(--tc-s1)', borderRadius: 20, border: '0.5px solid rgba(226,75,74,0.3)' }}>
            <AlertCircle size={34} style={{ color: 'var(--tc-danger)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Busca indisponível</p>
            <p style={{ color: 'var(--tc-txt2)', fontSize: 13, lineHeight: 1.6 }}>{erroBusca}</p>
            <button
              onClick={() => buscar(query)}
              style={{ marginTop: 16, border: 'none', borderRadius: 999, background: 'var(--tc-gold)', color: '#0D0D0D', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 16px' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {buscou && resultados.length === 0 && !carregando && !erroBusca && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--tc-s1)', borderRadius: 20, border: '0.5px solid var(--tc-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma música encontrada</p>
            <p style={{ color: 'var(--tc-txt2)', fontSize: 13 }}>Tente buscar por outro nome ou artista.</p>
          </div>
        )}

        {!buscou && !carregando && !erroBusca && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Search size={48} style={{ color: 'var(--tc-txt3)', marginBottom: 12 }} />
            <p style={{ color: 'var(--tc-txt2)', fontSize: 14 }}>Digite o nome de uma música ou artista</p>
          </div>
        )}
      </div>

      <BottomNav />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
