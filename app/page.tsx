'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import { obterTomMaisFrequente, obterPrecisaoMedia, obterTotalAnalises, obterUltimaAnalise, obterFavoritos, alternarFavorito, obterMusicasVisitadas, MusicaVisitada } from '@/lib/historico-local';
import { salvarENotificar, escutarStorage } from '@/lib/storage-events';
import Afinador from '@/app/components/Afinador';

const CACHE_CAPAS: Record<string, string> = {};

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const [afinadorAberto, setAfinadorAberto] = useState(false);
  const [perfil, setPerfil] = useState<{
    tom: string | null; precisao: number | null;
    total: number; ultima: number | null;
  } | null>(null);
  const [capas, setCapas] = useState<Record<string, string>>({});
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [favoritosCompletos, setFavoritosCompletos] = useState<Array<{id: string; titulo?: string; artista?: string; slug: string; isMock: boolean}>>([]);
  const [visitadas, setVisitadas] = useState<MusicaVisitada[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function recarregarDados() {
    setPerfil({
      tom: obterTomMaisFrequente(),
      precisao: obterPrecisaoMedia(),
      total: obterTotalAnalises(),
      ultima: obterUltimaAnalise(),
    });
    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      if (!raw) { setFavoritos([]); return; }
      const parsed = JSON.parse(raw);
      const ids = parsed.map((x: any) => typeof x === 'string' ? x : x.id);
      setFavoritos(ids);
      const itens = parsed.map((x: any) => {
        const id = typeof x === 'string' ? x : x.id;
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

  useEffect(() => {
    const todas = [
      ...visitadas.map(v => ({ id: v.id, titulo: v.titulo, artista: v.artista })),
      ...favoritosCompletos.map(f => ({ id: f.id, titulo: f.titulo || '', artista: f.artista || '' })),
    ];
    todas.forEach(item => {
      if (!item.titulo) return;
      if (CACHE_CAPAS[item.id]) {
        setCapas(prev => ({ ...prev, [item.id]: CACHE_CAPAS[item.id] }));
        return;
      }
      fetch(`/api/spotify?q=${encodeURIComponent(item.titulo + ' ' + item.artista)}`)
        .then(r => r.json())
        .then(d => {
          if (d.imagem) {
            CACHE_CAPAS[item.id] = d.imagem;
            setCapas(prev => ({ ...prev, [item.id]: d.imagem }));
          }
        }).catch(() => {});
    });
  }, [visitadas, favoritosCompletos]);

  function abrirUrl() {
    setErro('');
    const trimada = url.trim();
    const match = trimada.match(/cifraclub\.com\.br\/([a-z0-9-]+)\/([a-z0-9-]+)/);
    if (match) { router.push(`/musica/${match[1]}/${match[2]}`); return; }
    setErro('Cole uma URL válida do Cifra Club. Ex: cifraclub.com.br/legiao-urbana/tempo-perdido/');
  }

  function toggleFav(id: string, titulo?: string, artista?: string) {
    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      const atual: Array<{id: string; titulo?: string; artista?: string}> = raw ? JSON.parse(raw) : [];
      const normalizado = atual.map((x: any) => typeof x === 'string' ? { id: x } : x);
      const existe = normalizado.some((x: any) => x.id === id);
      const nova = existe
        ? normalizado.filter((x: any) => x.id !== id)
        : [...normalizado, { id, titulo, artista }];
      salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
      setFavoritos(nova.map((x: any) => x.id));
    } catch (e) {
      console.error('Erro ao salvar favorito:', e);
    }
  }

  const temHistorico = perfil !== null && perfil.total > 0;

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0d0a1f 0%, #1a0a2e 50%, #0d1a2e 100%)', padding: isMobile ? '32px 16px 48px' : '48px 24px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '20%', width: 200, height: 400, background: 'radial-gradient(ellipse, rgba(108,92,231,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: '15%', width: 200, height: 350, background: 'radial-gradient(ellipse, rgba(255,93,143,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 48, alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, color: '#fff' }}>
              Pare de adivinhar o capotraste.
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
              Descubra seu tom vocal com precisão e tenha cifras transpostas na medida certa para você.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => document.getElementById('campo-url')?.focus()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--violeta)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 32px rgba(108,92,231,0.5)' }}>
                🎤 Descobrir meu tom
              </button>
              <button onClick={() => setAfinadorAberto(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                🎸 Afinador
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>🛡️ Rápido, seguro e 100% no seu dispositivo</p>
          </div>

          {/* Perfil Vocal */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(108,92,231,0.4)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--violeta)', borderRadius: 12, padding: '8px 10px', fontSize: 18 }}>🎙️</div>
                <div>
                  <p style={{ fontWeight: 700, margin: 0, color: '#fff' }}>Seu perfil vocal</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    {temHistorico ? 'Analisado há pouco' : 'Ainda sem análises'}
                  </p>
                </div>
              </div>
              {temHistorico && (
                <span style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>✓ Atualizado</span>
              )}
            </div>

            {temHistorico ? (
              <>
                <p style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '0 0 4px' }}>Seu tom identificado</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', color: '#fff' }}>Tom {perfil!.tom}</p>
                    <span style={{ background: 'rgba(108,92,231,0.25)', color: 'var(--violeta)', borderRadius: 50, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>Fácil para cantar</span>
                  </div>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--violeta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'var(--violeta)' }}>
                    {perfil!.tom}
                  </div>
                </div>
                <Equalizador />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
                  <StatCard icon="🎵" label="EXTENSÃO" value="1.2 oitavas" sub="Barítono" />
                  <StatCard icon="🎯" label="ACURÁCIA" value={`${perfil!.precisao}%`} sub="Excelente" />
                  <StatCard icon="📈" label="ANÁLISES" value={String(perfil!.total)} sub="Total" />
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 36, margin: '0 0 8px' }}>🎤</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cole uma cifra e cante para criar seu perfil</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
        {/* COMO FUNCIONA */}
        <section style={{ padding: '36px 0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { n: 1, icon: '🎙️', title: 'Cante uma referência', desc: 'Cante por 10-15s em voz confortável.' },
              { n: 2, icon: '🎵', title: 'Analisamos seu tom', desc: 'Nosso algoritmo detecta sua nota fundamental.' },
              { n: 3, icon: '🎸', title: 'Geramos as cifras', desc: 'Transpondo para o tom ideal para você.' },
              { n: 4, icon: '🎶', title: 'Toque e cante melhor', desc: 'Cante com mais conforto e confiança.' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: 'var(--violeta)', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                </div>
                <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: 13 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAMPO URL */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--panel)', border: '2px solid var(--border)', borderRadius: 14, padding: '6px 6px 6px 16px' }}>
            <span style={{ fontSize: 16, color: 'var(--text-dim)' }}>🔍</span>
            <input
              id="campo-url"
              type="text"
              value={url}
              onChange={e => { setUrl(e.target.value); setErro(''); }}
              onKeyDown={e => e.key === 'Enter' && abrirUrl()}
              placeholder="Cole o link do Cifra Club..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)', padding: '8px 0' }}
            />
            <button onClick={abrirUrl}
              style={{ background: 'var(--violeta)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Abrir
            </button>
          </div>
          {erro && <p style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 6 }}>{erro}</p>}
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
            Ex: <span style={{ fontFamily: 'monospace', color: 'var(--violeta)' }}>cifraclub.com.br/legiao-urbana/tempo-perdido/</span>
          </p>
        </div>

        {/* FAVORITOS */}
        {favoritosCompletos.length > 0 && (
          <FavoritosSection favoritosCompletos={favoritosCompletos} capas={capas} toggleFav={toggleFav} />
        )}

        {/* HISTÓRICO */}
        <section style={{ marginBottom: 48 }}>
          {visitadas.length > 0 ? (
            <>
              <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 14 }}>
                🕐 Acessadas recentemente
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {visitadas.map(item => (
                  <VisitadaCard
                    key={item.id}
                    item={item}
                    capa={capas[item.id]}
                    isFav={favoritos.includes(item.id)}
                    onFav={() => toggleFav(item.id, item.titulo, item.artista)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--panel)', borderRadius: 20, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🎵</p>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Nenhuma música acessada ainda</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6 }}>
                Cole o link de uma música do Cifra Club no campo acima<br />e ela vai aparecer aqui na próxima vez.
              </p>
            </div>
          )}
        </section>
      </div>

      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 3px' }}>{icon} {label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 1px', color: '#fff' }}>{value}</p>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{sub}</p>
    </div>
  );
}

function Equalizador() {
  const alturas = [30, 50, 70, 90, 70, 50, 80, 60, 40, 70, 90, 50, 30, 60, 80, 70, 50, 40, 60, 80];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
      {alturas.map((h, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 3,
          background: 'linear-gradient(to top, #6c5ce7, #ff5d8f)',
          height: `${h}%`,
          animation: `onda ${0.8 + (i % 5) * 0.2}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.05}s`,
        }} />
      ))}
    </div>
  );
}

function FavoritosSection({ favoritosCompletos, capas, toggleFav }: {
  favoritosCompletos: Array<{id: string; titulo?: string; artista?: string; slug: string; isMock: boolean}>;
  capas: Record<string, string>;
  toggleFav: (id: string, titulo?: string, artista?: string) => void;
}) {
  const [expandido, setExpandido] = useState(true);
  const LIMITE = 4;
  const [verTodos, setVerTodos] = useState(false);
  const lista = verTodos ? favoritosCompletos : favoritosCompletos.slice(0, LIMITE);

  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', margin: 0 }}>
            ❤️ Minhas favoritas
          </h2>
          <span style={{ background: 'var(--violeta)', color: '#fff', borderRadius: 50, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
            {favoritosCompletos.length}
          </span>
        </div>
        <button
          onClick={() => setExpandido(e => !e)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-dim)' }}
        >
          {expandido ? '▲ Ocultar' : '▼ Mostrar'}
        </button>
      </div>

      {expandido && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {lista.map(item => {
              const titulo = item.titulo || item.id.split('/')[1]?.replace(/-/g, ' ') || 'Música';
              const artista = item.artista || item.id.split('/')[0]?.replace(/-/g, ' ') || 'Artista';
              const capa = capas[item.id];
              const href = item.isMock ? `/musica/${item.id}` : `/musica/${item.slug}`;
              return (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    width: 140,
                    flexShrink: 0,
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(108,92,231,0.3)';
                    (e.currentTarget as HTMLElement).style.zIndex = '10';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.zIndex = '1';
                  }}
                >
                  <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ height: 80, background: capa ? `url(${capa}) center/cover` : 'linear-gradient(135deg, #3b1f6e, #6c2a7a)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7))' }} />
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artista}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleFav(item.id)}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >❤️</button>
                </div>
              );
            })}
          </div>

          {favoritosCompletos.length > LIMITE && (
            <button
              onClick={() => setVerTodos(v => !v)}
              style={{ marginTop: 12, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', color: 'var(--text-dim)' }}
            >
              {verTodos ? 'Ver menos' : `Ver todas (${favoritosCompletos.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function VisitadaCard({ item, capa, isFav, onFav }: {
  item: MusicaVisitada;
  capa?: string;
  isFav: boolean;
  onFav: () => void;
}) {
  const href = item.id.includes('/') ? `/musica/${item.id}` : `/musica/${item.id}`;
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 110, background: capa ? `url(${capa}) center/cover` : 'linear-gradient(135deg, #3b1f6e, #6c2a7a)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.75))' }} />
        <button onClick={onFav}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.titulo}</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artista}</p>
        <Link href={href} style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
          Ver cifra
        </Link>
      </div>
    </div>
  );
}