'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcularIntervaloSemitons, transporCifraCompleta, transporTom, type NomeNota } from '@/lib/music-theory';
import { registrarDeteccao, ehFavorito, registrarVisita, alternarFavorito } from '@/lib/historico-local';
import {
  obterPreferenciasMusica, salvarPreferenciasMusica, intervaloParaPreferencias,
  PREFERENCIAS_PADRAO, type PreferenciasMusica,
} from '@/lib/preferencias-musica';
import { slugRealDoLegado } from '@/lib/data/songs-mock';
import CifraViewer from '@/app/components/CifraViewer';
import Modal from '@/app/components/ui/Modal';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import { useAuth } from '@/app/components/AuthProvider';
import { adicionarFavoritoNuvem, removerFavoritoNuvem, ehFavoritoNuvem } from '@/lib/favoritos-nuvem';
import { ArrowLeft, Check, Headphones, Heart, Printer, Save, SlidersHorizontal, Mic } from 'lucide-react';

interface MusicPageClientProps {
  params: { slug?: string[] };
}

interface CifraResult {
  id: string;
  titulo: string;
  artista: string;
  tomOriginal: string | null;
  capotraste: number | null;
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
  const [afinadorAberto, setAfinadorAberto] = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [mostrarGravador, setMostrarGravador] = useState(false);
  const [preferencias, setPreferencias] = useState<PreferenciasMusica>(PREFERENCIAS_PADRAO);
  const [preferenciasSalvas, setPreferenciasSalvas] = useState<PreferenciasMusica | null>(null);
  const [preferenciasProntas, setPreferenciasProntas] = useState(false);
  const [mensagemSalvar, setMensagemSalvar] = useState('');
  const { tamanhoFonte, simplificada } = preferencias;

  useEffect(() => {
    const salvas = obterPreferenciasMusica(slug);
    setPreferencias(salvas ?? PREFERENCIAS_PADRAO);
    setPreferenciasSalvas(salvas);
    setPreferenciasProntas(true);
  }, [slug]);

  useEffect(() => {
    if (!preferenciasProntas) return;
    if (!slug) {
      setErro('Escolha uma música na busca para abrir a cifra.');
      setCarregando(false);
      return;
    }
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
        if (controller.signal.aborted) return;
        if (data.erro) {
          setErro(data.erro);
        } else {
          setDados({ id: slug, ...data });
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
  }, [router, slug, simplificada, preferenciasProntas]);

  useEffect(() => {
    let ativo = true;
    if (user) {
      ehFavoritoNuvem(slug).then(valor => { if (ativo) setFavorito(valor); });
    } else {
      setFavorito(ehFavorito(slug));
    }
    return () => { ativo = false; };
  }, [user, slug]);

  function ajustarPreferencias(ajuste: Partial<PreferenciasMusica>) {
    setPreferencias(atuais => ({ ...atuais, ...ajuste }));
    setMensagemSalvar('');
  }

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
    if (!dados?.tomOriginal) return;
    const intervalo = calcularIntervaloSemitons(dados.tomOriginal, nota);
    if (intervalo === null) return;
    ajustarPreferencias({ tom: transporTom(dados.tomOriginal, intervalo), semitons: intervalo });
    setTomDetectado(nota);
    setEstabilidade(est);
    setMostrarGravador(false);
    registrarDeteccao(slug, nota, est);
  }

  function ajustarTom(delta: number) {
    if (!dados) return;
    const atual = intervaloParaPreferencias(dados.tomOriginal, preferencias);
    const novo = Math.min(12, Math.max(-12, atual + delta));
    ajustarPreferencias({ tom: dados.tomOriginal ? transporTom(dados.tomOriginal, novo) : null, semitons: novo });
  }

  function restaurarTomOriginal() {
    ajustarPreferencias({ tom: dados?.tomOriginal ?? null, semitons: 0 });
    setTomDetectado(null);
    setEstabilidade(null);
  }

  function salvarMeuTom() {
    if (!dados) return;
    const intervalo = intervaloParaPreferencias(dados.tomOriginal, preferencias);
    const ajustes = {
      ...preferencias,
      tom: dados.tomOriginal ? transporTom(dados.tomOriginal, intervalo) : null,
      semitons: intervalo,
    };
    if (salvarPreferenciasMusica(slug, ajustes)) {
      setPreferencias(ajustes);
      setPreferenciasSalvas(ajustes);
      setMensagemSalvar('Tom e leitura salvos neste navegador.');
    } else {
      setMensagemSalvar('Não foi possível salvar neste navegador. Seus ajustes continuam nesta sessão; tente salvar novamente.');
    }
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

  const semitons = intervaloParaPreferencias(dados.tomOriginal, preferencias);

  const cifraExibida = semitons !== 0
    ? transporCifraCompleta(dados.cifra, semitons)
    : dados.cifra;

  const tomAtual = dados.tomOriginal ? transporTom(dados.tomOriginal, semitons) : 'Não informado';
  const estaSalvo = preferenciasSalvas !== null
    && preferenciasSalvas.tom === (dados.tomOriginal ? tomAtual : null)
    && preferenciasSalvas.semitons === semitons
    && preferenciasSalvas.tamanhoFonte === tamanhoFonte
    && preferenciasSalvas.simplificada === simplificada
    && preferenciasSalvas.velocidade === preferencias.velocidade
    && preferenciasSalvas.duasColunas === preferencias.duasColunas;

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

        <section aria-label="Ajustes da música" className="no-print music-controls">
          <div className="music-controls-row">
            <div className="music-current-key">
              <span className="music-control-label">Tom</span>
              <strong>{tomAtual}</strong>
              {semitons !== 0 && <small>({semitons > 0 ? '+' : ''}{semitons})</small>}
            </div>
            <div className="music-control-group">
              <button aria-label="Diminuir meio tom" disabled={semitons <= -12} onClick={() => ajustarTom(-1)}>−</button>
              <span>½ tom</span>
              <button aria-label="Aumentar meio tom" disabled={semitons >= 12} onClick={() => ajustarTom(1)}>+</button>
            </div>
            <button className="music-action music-action-primary" onClick={() => setMostrarGravador(true)}
              disabled={!dados.tomOriginal} aria-label="Cantar para ajustar"
              title={dados.tomOriginal ? 'Cante um trecho desta música' : 'A fonte não informou o tom original'}>
              <Mic size={16} /> Cantar
            </button>
          </div>
          <div className="music-controls-row">
            <button className="music-action" onClick={() => ajustarPreferencias({ simplificada: !simplificada })}
              aria-pressed={simplificada} title="Alternar a versão da cifra">
              {simplificada && <Check size={13} />} Simplificada
            </button>
            <div className="music-control-group">
              <button aria-label="Diminuir tamanho da letra" disabled={tamanhoFonte <= 12}
                onClick={() => ajustarPreferencias({ tamanhoFonte: Math.max(12, tamanhoFonte - 1) })}>A−</button>
              <span>{tamanhoFonte}</span>
              <button aria-label="Aumentar tamanho da letra" disabled={tamanhoFonte >= 24}
                onClick={() => ajustarPreferencias({ tamanhoFonte: Math.min(24, tamanhoFonte + 1) })}>A+</button>
            </div>
            <button className="music-action" onClick={salvarMeuTom} aria-label="Salvar meu tom e leitura"
              title="Salvar o tom e as preferências desta música neste navegador">
              {estaSalvo ? <Check size={15} /> : <Save size={15} />} {estaSalvo ? 'Salvo' : 'Salvar'}
            </button>
          </div>
          <div className="music-controls-caption">
            <a href={`https://www.cifraclub.com.br/${slug}/${simplificada ? 'simplificada.html' : ''}`} target="_blank" rel="noopener noreferrer">Fonte: Cifra Club</a>
            {dados.capotraste !== null && <span>Capotraste: {dados.capotraste}ª casa</span>}
            {semitons !== 0 && <button onClick={restaurarTomOriginal}>Voltar ao tom original</button>}
          </div>
          {(mensagemSalvar || preferenciasSalvas) && (
            <p role="status" className="music-settings-status">
              {mensagemSalvar || (estaSalvo ? 'Ajustes salvos neste navegador.' : 'Você tem alterações ainda não salvas.')}
            </p>
          )}
          {!dados.tomOriginal && <p className="music-settings-status">A fonte não informou o tom original. Use + e − para ajustar a cifra.</p>}
          {tomDetectado && <p className="music-settings-status">Sugestão do trecho: {tomDetectado} · confiança {estabilidade}%. Confira cantando com a cifra.</p>}
        </section>

        <div className="hidden print:block" style={{ padding: '16px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{dados.titulo}</h1>
          <p style={{ fontSize: 13 }}>{dados.artista} — Tom: {tomAtual}{dados.capotraste !== null && ` — Capotraste: ${dados.capotraste}ª casa`}</p>
        </div>

        <div className="music-cifra-region" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <CifraViewer
            cifra={cifraExibida} tamanhoFonte={tamanhoFonte}
            velocidade={preferencias.velocidade} duasColunas={preferencias.duasColunas}
            onVelocidadeChange={velocidade => ajustarPreferencias({ velocidade })}
            onColunasChange={duasColunas => ajustarPreferencias({ duasColunas })}
          />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Modal aberto={mostrarGravador} onFechar={() => setMostrarGravador(false)} titulo="Ajustar o tom da música">
        <p className="mb-3 text-sm text-text-dim">Cante um trecho de {dados.titulo} como você costuma cantar.</p>
        <GravadorDeTom onTomDetectado={handleTomDetectado} />
      </Modal>
      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}
