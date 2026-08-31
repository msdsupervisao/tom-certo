'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcularIntervaloSemitons, transporCifraCompleta, NomeNota, NOMES_NOTAS } from '@/lib/music-theory';
import { registrarDeteccao, ehFavorito, registrarVisita, alternarFavorito } from '@/lib/historico-local';
import { salvarENotificar } from '@/lib/storage-events';
import { slugRealDoLegado } from '@/lib/data/songs-mock';
import CifraViewer from '@/app/components/CifraViewer';
import Magnetic from '@/app/components/Magnetic';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import { useAuth } from '@/app/components/AuthProvider';
import { adicionarFavoritoNuvem, removerFavoritoNuvem, ehFavoritoNuvem } from '@/lib/favoritos-nuvem';
import { ArrowLeft, Headphones, Heart, Printer, SlidersHorizontal, Mic } from 'lucide-react';

interface MusicPageClientProps {
  params: { slug?: string[] };
}

interface CifraResult {
  id: string;
  titulo: string;
  artista: string;
  tomOriginal: string;
  cifra: string;
  slug: string;
  simplificada?: boolean;
}

export default function MusicPageClient({ params }: MusicPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const slugParts = params.slug ?? [];
  const slug = slugParts.join('/');

  const [dados, setDados] = useState<CifraResult | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tomDetectado, setTomDetectado] = useState<NomeNota | null>(null);
  const [estabilidade, setEstabilidade] = useState<number | null>(null);
  const [ajusteManual, setAjusteManual] = useState(0);
  const [afinadorAberto, setAfinadorAberto] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(15);
  const [favorito, setFavorito] = useState(false);
  const [mostrarGravador, setMostrarGravador] = useState(false);
  const [simplificada, setSimplificada] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);

    // Ids legados do antigo catálogo de teste (1–5) → redireciona para a
    // cifra real no Cifra Club.
    const slugReal = slugRealDoLegado(slug);
    if (slugReal) {
      router.replace(`/musica/${slugReal}`);
      return;
    }

    fetch(`/api/cifra?slug=${encodeURIComponent(slug)}${simplificada ? '&simplificada=1' : ''}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.erro) {
          setErro(data.erro);
        } else {
          setDados({ id: slug, ...data });
          setFavorito(ehFavorito(slug));
          registrarVisita(slug, data.titulo, data.artista);
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setErro('Falha ao carregar. Verifique sua conexão.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, [router, slug, simplificada]);

  useEffect(() => {
    if (!user || !slug) return;
    ehFavoritoNuvem(slug).then(setFavorito);
  }, [user, slug]);

  async function toggleFavorito() {
    if (!dados) return;
    if (user) {
      const sucesso = favorito
        ? await removerFavoritoNuvem(slug)
        : await adicionarFavoritoNuvem(slug, dados.titulo, dados.artista);
      if (sucesso) setFavorito(!favorito);
    } else {
      const novaLista = alternarFavorito(slug, dados.titulo, dados.artista);
      setFavorito(novaLista.some((item) => item.id === slug));
    }
  }

  function handleTomDetectado(nota: NomeNota, est: number) {
    setTomDetectado(nota);
    setEstabilidade(est);
    setMostrarGravador(false);
    registrarDeteccao(slug, nota, est);
  }

  function voltar() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--tc-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--tc-border)', borderTopColor: 'var(--tc-gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--tc-txt2)' }}>Carregando cifra...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', padding: '16px' }}>
        <button onClick={voltar} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--tc-txt2)', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={{ borderRadius: 16, border: '1px solid rgba(226,75,74,0.3)', background: 'var(--tc-s1)', padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--tc-danger)' }}>{erro || 'Cifra não encontrada.'}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, border: 'none', borderRadius: 999, background: 'var(--tc-gold)', color: '#0D0D0D', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 16px' }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const semitons = tomDetectado
    ? calcularIntervaloSemitons(dados.tomOriginal as NomeNota, tomDetectado) + ajusteManual
    : ajusteManual;

  const cifraExibida = semitons !== 0
    ? transporCifraCompleta(dados.cifra, semitons)
    : dados.cifra;

  const indiceOriginal = NOMES_NOTAS.indexOf(dados.tomOriginal as NomeNota);
  const tomAtual = indiceOriginal >= 0
    ? NOMES_NOTAS[((indiceOriginal + semitons) % 12 + 12) % 12]
    : dados.tomOriginal;

  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${dados.titulo} ${dados.artista}`)}`;

  return (
    <div className="music-page-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--tc-bg)' }}>
      <div className="music-page-content" style={{ maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 10px', flexShrink: 0 }}>
          <button
            onClick={voltar}
            aria-label="Voltar"
            className="tc-press"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-txt2)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dados.titulo}</p>
            <p style={{ fontSize: 12, color: 'var(--tc-txt2)' }}>{dados.artista}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => window.open(spotifySearchUrl, '_blank', 'noopener,noreferrer')}
              className="tc-press music-spotify-button"
              aria-label="Abrir no Spotify"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minWidth: 44, minHeight: 44, padding: '10px 14px', borderRadius: 12, background: 'var(--tc-gold)', color: '#0D0D0D', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              <Headphones size={16} />
              <span className="music-spotify-label">Abrir no Spotify</span>
            </button>
            <button
              onClick={toggleFavorito}
              className="tc-press"
              style={{ width: 44, height: 44, borderRadius: 12, background: favorito ? 'var(--tc-gold)' : 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', color: favorito ? '#0D0D0D' : 'var(--tc-txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart size={16} fill={favorito ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setAfinadorAberto(true)}
              aria-label="Afinador"
              className="tc-press"
              style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', color: 'var(--tc-txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              onClick={() => window.print()}
              aria-label="Imprimir"
              className="tc-press music-print-button"
              style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', color: 'var(--tc-txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--tc-s1)', borderTop: '0.5px solid var(--tc-border)', borderBottom: '0.5px solid var(--tc-border)', padding: '9px 16px', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tom</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tc-gold)' }}>{tomAtual}</span>
            {semitons !== 0 && (
              <span style={{ fontSize: 11, color: 'var(--tc-txt3)' }}>({semitons > 0 ? '+' : ''}{semitons} st)</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSimplificada((s) => !s)}
              aria-pressed={simplificada}
              className="tc-press"
              title={simplificada ? 'Mostrando acordes simplificados — clique para a versão completa' : 'Mostrar acordes simplificados (mais fáceis, sem tablatura)'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, borderRadius: 20, padding: '0 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: simplificada ? 'rgba(212,160,23,0.15)' : 'var(--tc-s2)', border: simplificada ? '0.5px solid rgba(212,160,23,0.45)' : '0.5px solid var(--tc-border)', color: simplificada ? 'var(--tc-gold)' : 'var(--tc-txt2)' }}
            >
              {simplificada ? '✓ ' : ''}Simplificada
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 20, padding: '8px 12px' }}>
              <button
                onClick={() => setTamanhoFonte((t) => Math.max(12, t - 1))}
                disabled={tamanhoFonte <= 12}
                className="tc-press"
                style={{ width: 44, height: 44, borderRadius: 8, background: 'none', border: 'none', color: tamanhoFonte <= 12 ? 'var(--tc-txt3)' : 'var(--tc-txt2)', cursor: tamanhoFonte <= 12 ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: tamanhoFonte <= 12 ? 0.5 : 1 }}
              >
                A−
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-gold)', minWidth: 32, textAlign: 'center' }}>{tamanhoFonte}</span>
              <button
                onClick={() => setTamanhoFonte((t) => Math.min(24, t + 1))}
                disabled={tamanhoFonte >= 24}
                className="tc-press"
                style={{ width: 44, height: 44, borderRadius: 8, background: 'none', border: 'none', color: tamanhoFonte >= 24 ? 'var(--tc-txt3)' : 'var(--tc-txt2)', cursor: tamanhoFonte >= 24 ? 'not-allowed' : 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: tamanhoFonte >= 24 ? 0.5 : 1 }}
              >
                A+
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 20, padding: '8px 12px' }}>
              <button aria-label="Diminuir meio tom" onClick={() => setAjusteManual((a) => a - 1)} className="tc-press" style={{ fontSize: 18, width: 34, height: 34, borderRadius: 10, background: 'none', border: 'none', color: 'var(--tc-txt2)', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tc-txt2)', minWidth: 38, textAlign: 'center' }}>½ Tom</span>
              <button aria-label="Aumentar meio tom" onClick={() => setAjusteManual((a) => a + 1)} className="tc-press" style={{ fontSize: 18, width: 34, height: 34, borderRadius: 10, background: 'none', border: 'none', color: 'var(--tc-txt2)', cursor: 'pointer' }}>+</button>
              {semitons !== 0 && (
                <button onClick={() => { setAjusteManual(0); setTomDetectado(null); setEstabilidade(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tc-txt3)' }}>✕</button>
              )}
            </div>

            {!mostrarGravador && !tomDetectado && (
              <Magnetic>
                <button
                  onClick={() => setMostrarGravador(true)}
                  className="tc-press"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tc-gold)', color: '#0D0D0D', border: 'none', borderRadius: 24, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', minHeight: 44, minWidth: 44 }}
                >
                  <Mic size={16} /> Cantar para ajustar
                </button>
              </Magnetic>
            )}

            {tomDetectado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 10, padding: '6px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: estabilidade && estabilidade >= 70 ? '#2dd4bf' : 'var(--tc-gold)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--tc-txt2)' }}>{estabilidade}%</span>
                <button onClick={() => { setTomDetectado(null); setEstabilidade(null); setMostrarGravador(false); setAjusteManual(0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tc-gold)', fontWeight: 600 }}>Cantar de novo</button>
              </div>
            )}
          </div>
        </div>

        {mostrarGravador && (
          <div className="no-print" style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--tc-border)', flexShrink: 0 }}>
            <GravadorDeTom onTomDetectado={handleTomDetectado} />
          </div>
        )}

        <div className="hidden print:block" style={{ padding: '16px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{dados.titulo}</h1>
          <p style={{ fontSize: 13 }}>{dados.artista} — Tom: {tomAtual}</p>
        </div>

        <div className="music-cifra-region" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <CifraViewer cifra={cifraExibida} tamanhoFonte={tamanhoFonte} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}
