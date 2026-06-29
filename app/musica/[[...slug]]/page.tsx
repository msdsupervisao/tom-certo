'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { calcularIntervaloSemitons, transporCifraCompleta, NomeNota, NOMES_NOTAS } from '@/lib/music-theory';
import { registrarDeteccao, ehFavorito, registrarVisita, alternarFavorito } from '@/lib/historico-local';
import { salvarENotificar } from '@/lib/storage-events';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import CifraViewer from '@/app/components/CifraViewer';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import { useAuth } from '@/app/components/AuthProvider';
import { adicionarFavoritoNuvem, removerFavoritoNuvem, ehFavoritoNuvem } from '@/lib/favoritos-nuvem';
import { ArrowLeft, Heart, Printer, SlidersHorizontal, Mic } from 'lucide-react';

interface CifraResult {
  id: string;
  titulo: string;
  artista: string;
  tomOriginal: string;
  cifra: string;
  slug: string;
}

export default function MusicaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug as string];
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

  useEffect(() => {
    if (!slug) return;
    setCarregando(true);
    setErro(null);

    const mock = buscarMusicaPorId(slug);
    if (mock) {
      setDados({ id: mock.id, titulo: mock.titulo, artista: mock.artista, tomOriginal: mock.tomOriginal, cifra: mock.cifra, slug: mock.id });
      setFavorito(ehFavorito(slug));
      registrarVisita(slug, mock.titulo, mock.artista);
      setCarregando(false);
      return;
    }

    fetch(`/api/cifra?slug=${encodeURIComponent(slug)}`)
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
      .catch(() => setErro('Falha ao carregar. Verifique sua conexão.'))
      .finally(() => setCarregando(false));
  }, [slug]);

  useEffect(() => {
    if (!user || !slug) return;
    ehFavoritoNuvem(slug).then(setFavorito);
  }, [user, slug]);

  async function toggleFavorito() {
    if (!dados) return;
    if (user) {
      if (favorito) {
        await removerFavoritoNuvem(slug);
      } else {
        await adicionarFavoritoNuvem(slug, dados.titulo, dados.artista);
      }
      setFavorito(!favorito);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 10px', flexShrink: 0 }}>
          <button
            onClick={voltar}
            aria-label="Voltar"
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-txt2)', cursor: 'pointer', flexShrink: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dados.titulo}</p>
            <p style={{ fontSize: 12, color: 'var(--tc-txt2)' }}>{dados.artista}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <IcoBtn onClick={toggleFavorito} active={favorito} aria-label="Favoritar">
              <Heart size={16} fill={favorito ? 'currentColor' : 'none'} />
            </IcoBtn>
            <IcoBtn onClick={() => setAfinadorAberto(true)} aria-label="Afinador">
              <SlidersHorizontal size={16} />
            </IcoBtn>
            <IcoBtn onClick={() => window.print()} aria-label="Imprimir">
              <Printer size={16} />
            </IcoBtn>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 20, padding: '4px 8px' }}>
              <button
                onClick={() => setTamanhoFonte((t) => Math.max(12, t - 1))}
                disabled={tamanhoFonte <= 12}
                style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', color: 'var(--tc-txt2)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                A-
              </button>
              <span style={{ fontSize: 11, color: 'var(--tc-txt3)', minWidth: 20, textAlign: 'center' }}>{tamanhoFonte}</span>
              <button
                onClick={() => setTamanhoFonte((t) => Math.min(24, t + 1))}
                disabled={tamanhoFonte >= 24}
                style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', color: 'var(--tc-txt2)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                A+
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 20, padding: '4px 10px' }}>
              <TransBtn onClick={() => setAjusteManual((a) => a - 1)}>−</TransBtn>
              <span style={{ fontSize: 11, color: 'var(--tc-txt2)', minWidth: 32, textAlign: 'center' }}>½ Tom</span>
              <TransBtn onClick={() => setAjusteManual((a) => a + 1)}>+</TransBtn>
              {semitons !== 0 && (
                <button onClick={() => { setAjusteManual(0); setTomDetectado(null); setEstabilidade(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tc-txt3)' }}>✕</button>
              )}
            </div>

            {!mostrarGravador && !tomDetectado && (
              <button
                onClick={() => setMostrarGravador(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--tc-gold)', color: '#0D0D0D', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                <Mic size={13} /> Cantar para ajustar
              </button>
            )}

            {tomDetectado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tc-s2)', border: '0.5px solid var(--tc-border)', borderRadius: 10, padding: '6px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: estabilidade && estabilidade >= 70 ? '#2dd4bf' : 'var(--tc-gold)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--tc-txt2)' }}>{estabilidade}%</span>
                <button onClick={() => { setTomDetectado(null); setEstabilidade(null); setMostrarGravador(false); setAjusteManual(0); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tc-gold)', fontWeight: 600 }}>
                  Cantar de novo
                </button>
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>
          <CifraViewer cifra={cifraExibida} tamanhoFonte={tamanhoFonte} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}

function IcoBtn({ children, onClick, active, 'aria-label': label }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; 'aria-label'?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label}
      style={{ width: 34, height: 34, borderRadius: 10, background: active ? 'var(--tc-gold-dim)' : 'var(--tc-s1)', border: `0.5px solid ${active ? 'var(--tc-gold-border)' : 'var(--tc-border)'}`, color: active ? 'var(--tc-gold)' : 'var(--tc-txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
      {children}
    </button>
  );
}

function TransBtn({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--tc-s3)', border: '0.5px solid var(--tc-border)', color: 'var(--tc-txt)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {children}
    </button>
  );
}
