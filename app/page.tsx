'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import {
  obterTomMaisFrequente, obterPrecisaoMedia, obterTotalAnalises,
  obterMusicasVisitadas, MusicaVisitada, registrarDeteccao, registrarVisita,
} from '@/lib/historico-local';
import { salvarENotificar, escutarStorage } from '@/lib/storage-events';
import {
  adicionarFavoritoNuvem,
  obterFavoritosNuvem,
  removerFavoritoNuvem,
  type ItemFavorito,
} from '@/lib/favoritos-nuvem';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import BottomNav from '@/app/components/BottomNav';
import Text3DFlip from '@/app/components/Text3DFlip';
import Magnetic from '@/app/components/Magnetic';
import { AlertCircle, Mic, SlidersHorizontal, Search, Music, Heart, X } from 'lucide-react';

/** Move o brilho radial (.tc-glow) para a posição do cursor sobre o card. */
function glowMove(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--gx', `${e.clientX - r.left}px`);
  el.style.setProperty('--gy', `${e.clientY - r.top}px`);
}
import type { NomeNota } from '@/lib/music-theory';

const CACHE_CAPAS: Record<string, string> = {};
const CHAVE_BUSCA_HOME = 'tom-certo:busca-home';

interface FavItem {
  id: string;
  titulo?: string;
  artista?: string;
  slug: string;
  isMock: boolean;
}

interface ResultadoBusca {
  titulo: string;
  artista: string;
  url: string;
  slug: string;
}

interface ArtistaBusca {
  nome: string;
  slug: string;
  url: string;
  imagem?: string | null;
}

type ModoBusca = 'musicas' | 'artistas';

interface BuscaPersistida {
  modo: ModoBusca;
  query: string;
  artistaSlug?: string;
}

function normalizarFavorito(item: string | ItemFavorito): FavItem {
  const id = typeof item === 'string' ? item : item.id;
  const mockSong = buscarMusicaPorId(id);
  if (mockSong) {
    return {
      id,
      titulo: mockSong.titulo,
      artista: mockSong.artista,
      slug: id,
      isMock: true,
    };
  }
  return {
    id,
    titulo: typeof item === 'string' ? undefined : item.titulo,
    artista: typeof item === 'string' ? undefined : item.artista,
    slug: id,
    isMock: false,
  };
}

function salvarBuscaPersistida(busca: BuscaPersistida | null) {
  try {
    if (busca) sessionStorage.setItem(CHAVE_BUSCA_HOME, JSON.stringify(busca));
    else sessionStorage.removeItem(CHAVE_BUSCA_HOME);
  } catch {}
}

function saudacaoDoDia(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [afinadorAberto, setAfinadorAberto]         = useState(false);
  const [gravadorAberto, setGravadorAberto]         = useState(false);
  const [tomDetectado, setTomDetectado]             = useState<string | null>(null);
  const [perfil, setPerfil]                         = useState<{ tom: string | null; precisao: number | null; total: number } | null>(null);
  const [favoritos, setFavoritos]                   = useState<string[]>([]);
  const [favoritosCompletos, setFavoritosCompletos] = useState<FavItem[]>([]);
  const [visitadas, setVisitadas]                   = useState<MusicaVisitada[]>([]);
  const [modoBusca, setModoBusca]                   = useState<ModoBusca>('musicas');
  const [buscaQuery, setBuscaQuery]                 = useState('');
  const [resultadosBusca, setResultadosBusca]       = useState<ResultadoBusca[]>([]);
  const [artistasBusca, setArtistasBusca]           = useState<ArtistaBusca[]>([]);
  const [artistaSelecionado, setArtistaSelecionado] = useState<ArtistaBusca | null>(null);
  const [totalMusicasArtista, setTotalMusicasArtista] = useState(0);
  const [buscaCarregando, setBuscaCarregando]       = useState(false);
  const [buscaFeita, setBuscaFeita]                 = useState(false);
  const [buscaErro, setBuscaErro]                   = useState('');
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaSeqRef = useRef(0);
  const buscaRestauradaRef = useRef(false);

  const primeiroNome = user?.user_metadata?.full_name?.trim()?.split(' ')[0]
    || user?.email?.split('@')[0]?.replace(/[\d_.-]/g, '')
    || '';
  const saudacao = saudacaoDoDia();
  const saudacaoCompleta = primeiroNome 
    ? `${saudacao}, ${primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase()}`
    : saudacao;
  const inicialAvatar = primeiroNome ? primeiroNome.charAt(0).toUpperCase() : '?';

  const recarregarDados = useCallback(() => {
    setPerfil({
      tom:      obterTomMaisFrequente(),
      precisao: obterPrecisaoMedia(),
      total:    obterTotalAnalises(),
    });
    setVisitadas(obterMusicasVisitadas(12));

    if (user) {
      void obterFavoritosNuvem().then((lista) => {
        setFavoritos(lista.map((item) => item.id));
        setFavoritosCompletos(lista.map(normalizarFavorito));
      });
      return;
    }

    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      if (!raw) { setFavoritos([]); setFavoritosCompletos([]); }
      else {
        const parsed = JSON.parse(raw) as Array<string | ItemFavorito>;
        setFavoritos(parsed.map((item) => typeof item === 'string' ? item : item.id));
        setFavoritosCompletos(parsed.map(normalizarFavorito));
      }
    } catch {
      setFavoritos([]);
      setFavoritosCompletos([]);
    }
  }, [user]);

  useEffect(() => {
    recarregarDados();
    return escutarStorage(recarregarDados);
  }, [pathname, recarregarDados]);

  useEffect(() => {
    return () => {
      if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    };
  }, []);

  const buscarNaHome = useCallback(async (q: string, modo: ModoBusca = modoBusca, artistaSlug = '') => {
    const termo = q.trim();
    const seq = ++buscaSeqRef.current;

    if (termo.length < 2) {
      setResultadosBusca([]);
      setArtistasBusca([]);
      setArtistaSelecionado(null);
      setTotalMusicasArtista(0);
      setBuscaFeita(false);
      setBuscaErro('');
      setBuscaCarregando(false);
      return;
    }

    setBuscaCarregando(true);
    setBuscaErro('');
    try {
      const params = new URLSearchParams({ q: termo, modo });
      if (modo === 'artistas' && artistaSlug) params.set('artista', artistaSlug);
      const res = await fetch(`/api/buscar?${params.toString()}`);
      const data = await res.json();
      if (seq !== buscaSeqRef.current) return;
      if (!res.ok) throw new Error(data.erro || 'Busca indisponível');
      const selecionado = data.artistaSelecionado && typeof data.artistaSelecionado.slug === 'string'
        ? data.artistaSelecionado as ArtistaBusca
        : null;
      setResultadosBusca(Array.isArray(data.resultados) ? data.resultados : []);
      setArtistasBusca(Array.isArray(data.artistas) ? data.artistas : []);
      setArtistaSelecionado(selecionado);
      setTotalMusicasArtista(Number(data.totalMusicasArtista || 0));
      setBuscaFeita(true);
      salvarBuscaPersistida({
        modo,
        query: termo,
        artistaSlug: modo === 'artistas' ? selecionado?.slug || artistaSlug || undefined : undefined,
      });
    } catch (erro) {
      if (seq !== buscaSeqRef.current) return;
      setResultadosBusca([]);
      setArtistasBusca([]);
      setArtistaSelecionado(null);
      setTotalMusicasArtista(0);
      setBuscaErro(erro instanceof Error ? erro.message : 'Não foi possível buscar agora.');
      setBuscaFeita(true);
    } finally {
      if (seq === buscaSeqRef.current) setBuscaCarregando(false);
    }
  }, [modoBusca]);

  useEffect(() => {
    if (buscaRestauradaRef.current) return;
    buscaRestauradaRef.current = true;

    try {
      const raw = sessionStorage.getItem(CHAVE_BUSCA_HOME);
      if (!raw) return;
      const salva = JSON.parse(raw) as Partial<BuscaPersistida>;
      if ((salva.modo !== 'musicas' && salva.modo !== 'artistas') || typeof salva.query !== 'string' || salva.query.trim().length < 2) {
        salvarBuscaPersistida(null);
        return;
      }

      setModoBusca(salva.modo);
      setBuscaQuery(salva.query);
      void buscarNaHome(
        salva.query,
        salva.modo,
        typeof salva.artistaSlug === 'string' ? salva.artistaSlug : ''
      );
    } catch {
      salvarBuscaPersistida(null);
    }
  }, [buscarNaHome]);

  function handleTomDetectado(nota: NomeNota, estabilidade: number) {
    registrarDeteccao('_home', nota, estabilidade);
    setTomDetectado(nota);
    setGravadorAberto(false);
    // Recarrega o perfil para mostrar o tom atualizado
    setPerfil({
      tom:      obterTomMaisFrequente(),
      precisao: obterPrecisaoMedia(),
      total:    obterTotalAnalises(),
    });
  }

  async function toggleFav(id: string, titulo?: string, artista?: string) {
    const existe = favoritos.includes(id);

    if (user) {
      const sucesso = existe
        ? await removerFavoritoNuvem(id)
        : await adicionarFavoritoNuvem(id, titulo, artista);
      if (!sucesso) return;

      setFavoritos((atuais) => existe ? atuais.filter((item) => item !== id) : [id, ...atuais]);
      setFavoritosCompletos((atuais) => existe
        ? atuais.filter((item) => item.id !== id)
        : [normalizarFavorito({ id, titulo, artista }), ...atuais.filter((item) => item.id !== id)]
      );
      return;
    }

    try {
      const raw    = localStorage.getItem('tom-certo:favoritos');
      const atual: Array<string | ItemFavorito> = raw ? JSON.parse(raw) : [];
      const norm = atual.map((item) => typeof item === 'string' ? { id: item } : item);
      const nova = existe ? norm.filter((item) => item.id !== id) : [{ id, titulo, artista }, ...norm];
      salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
      setFavoritos(nova.map((item) => item.id));
      setFavoritosCompletos(nova.map(normalizarFavorito));
    } catch {}
  }

  function focarBusca() {
    buscaInputRef.current?.focus();
    buscaInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleBuscaChange(event: React.ChangeEvent<HTMLInputElement>) {
    const valor = event.target.value;
    const termo = valor.trim();
    setBuscaQuery(valor);
    salvarBuscaPersistida({ modo: modoBusca, query: valor });
    buscaSeqRef.current += 1;
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);

    if (termo.length < 2) {
      setResultadosBusca([]);
      setArtistasBusca([]);
      setArtistaSelecionado(null);
      setTotalMusicasArtista(0);
      setBuscaFeita(false);
      setBuscaErro('');
      setBuscaCarregando(false);
      return;
    }

    setBuscaCarregando(true);
    setBuscaErro('');
    setResultadosBusca([]);
    setArtistasBusca([]);
    setArtistaSelecionado(null);
    setTotalMusicasArtista(0);
    buscaTimerRef.current = setTimeout(() => buscarNaHome(valor, modoBusca), modoBusca === 'artistas' ? 450 : 300);
  }

  function limparBusca() {
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    buscaSeqRef.current += 1;
    setBuscaQuery('');
    setResultadosBusca([]);
    setArtistasBusca([]);
    setArtistaSelecionado(null);
    setTotalMusicasArtista(0);
    setBuscaFeita(false);
    setBuscaErro('');
    setBuscaCarregando(false);
    salvarBuscaPersistida(null);
    buscaInputRef.current?.focus();
  }

  function trocarModoBusca(modo: ModoBusca) {
    if (modo === modoBusca) return;
    setModoBusca(modo);
    salvarBuscaPersistida({ modo, query: buscaQuery });
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    buscaSeqRef.current += 1;
    setResultadosBusca([]);
    setArtistasBusca([]);
    setArtistaSelecionado(null);
    setTotalMusicasArtista(0);
    setBuscaFeita(false);
    setBuscaErro('');

    if (buscaQuery.trim().length >= 2) {
      setBuscaCarregando(true);
      buscaTimerRef.current = setTimeout(() => buscarNaHome(buscaQuery, modo), modo === 'artistas' ? 150 : 100);
    } else {
      setBuscaCarregando(false);
    }
  }

  function selecionarArtista(artista: ArtistaBusca) {
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    setBuscaCarregando(true);
    setBuscaErro('');
    setArtistaSelecionado(artista);
    setResultadosBusca([]);
    setTotalMusicasArtista(0);
    salvarBuscaPersistida({ modo: 'artistas', query: buscaQuery || artista.nome, artistaSlug: artista.slug });
    buscarNaHome(buscaQuery || artista.nome, 'artistas', artista.slug);
  }

  function abrirResultadoBusca(resultado: ResultadoBusca) {
    salvarBuscaPersistida({
      modo: modoBusca,
      query: buscaQuery,
      artistaSlug: modoBusca === 'artistas' ? artistaSelecionado?.slug : undefined,
    });
    registrarVisita(resultado.slug, resultado.titulo, resultado.artista);
    router.push(`/musica/${resultado.slug}`);
  }

  const temTom      = perfil && perfil.total > 0 && perfil.tom;
  const ultimaVisitada = visitadas[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)', fontFamily: 'var(--font-ui)' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 8px', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)', letterSpacing: -0.5 }}>
              Tom<span style={{ color: 'var(--tc-txt3)', fontWeight: 500 }}>Certo</span>
            </span>
            <p style={{ fontSize: 11, color: 'var(--tc-txt3)', marginTop: 2 }}>{saudacaoCompleta}</p>
          </div>
          {user ? (
            <Link href="/perfil" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-gold)', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-display)' }}>
              {inicialAvatar}
            </Link>
          ) : (
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderRadius: 999, background: 'var(--tc-gold)', color: '#0D0D0D', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Entrar
            </Link>
          )}
        </div>
      </div>

      {!user && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--tc-txt2)' }}>
            Entre para sincronizar favoritos, histórico e continuar em outro dispositivo.
          </p>
        </div>
      )}

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}>

        {/* Toast de tom detectado */}
        {tomDetectado && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(212,160,23,0.12)', border: '0.5px solid rgba(212,160,23,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🎵</span>
            <p style={{ flex: 1, fontSize: 13, color: 'var(--tc-gold)', fontWeight: 500 }}>
              Tom detectado: <strong>{tomDetectado}</strong> — busque músicas nesse tom!
            </p>
            <button onClick={() => setTomDetectado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt3)', display: 'flex', padding: 0 }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* BENTO GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 14 }}>

          {/* Hero tom vocal */}
          <div onClick={() => { if (temTom) focarBusca(); else setGravadorAberto(true); }} onMouseMove={glowMove} className="tc-glow tc-lift tc-press" style={{ gridColumn: '1 / -1', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 18, padding: 16, cursor: 'pointer' }}>
            <p style={{ fontSize: 10, color: 'var(--tc-gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mic size={12} /> {temTom ? 'Tom vocal detectado' : 'Encontre seu tom vocal'}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--tc-txt)', lineHeight: 1.05, letterSpacing: 0 }}>
                  <Text3DFlip
                    text="Detecte seu tom"
                    color="var(--tc-txt)"
                    flipColor="var(--tc-gold)"
                  />
                </p>
                <p style={{ fontSize: 11, color: 'var(--tc-txt2)', marginTop: 4 }}>
                  {temTom ? `${perfil!.total} análises · ${perfil!.precisao ?? 0}% precisão` : 'Cante alguns segundos para ajustar cifras ao seu alcance'}
                </p>
              </div>
              {temTom ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 14, padding: '6px 16px', minWidth: 64 }}>
                  <span style={{ fontSize: 8, color: 'var(--tc-gold)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Seu tom</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--tc-gold)', lineHeight: 1 }}>{perfil!.tom}</span>
                </div>
              ) : (
                <Magnetic style={{ flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--tc-gold)', color: '#0D0D0D', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 30 }}>
                    <Mic size={13} /> Detectar tom
                  </span>
                </Magnetic>
              )}
            </div>
          </div>

          {/* Detectar tom → abre GravadorDeTom */}
          <div
            onClick={() => setGravadorAberto(true)}
            onMouseMove={glowMove}
            className="tc-glow tc-lift tc-press"
            style={{ background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 18, padding: 16, cursor: 'pointer', pointerEvents: 'auto' }}
          >
            <Mic size={26} style={{ color: 'var(--tc-gold)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-txt)' }}>Detectar tom</p>
            <p style={{ fontSize: 11, color: 'var(--tc-txt2)', marginTop: 3 }}>Via microfone</p>
          </div>

          {/* Afinador */}
          <div onClick={() => setAfinadorAberto(true)} onMouseMove={glowMove} className="tc-glow tc-lift tc-press" style={{ background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 18, padding: 16, cursor: 'pointer' }}>
            <SlidersHorizontal size={26} style={{ color: 'var(--tc-gold)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tc-txt)' }}>Afinador</p>
            <p style={{ fontSize: 11, color: 'var(--tc-txt2)', marginTop: 3 }}>Tempo real</p>
          </div>

          {/* Stats */}
          <div style={{ background: 'var(--tc-s1)', border: '0.5px solid rgba(212,160,23,0.2)', borderRadius: 18, padding: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--tc-gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Suas stats</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)' }}>{favoritosCompletos.length}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>favoritas</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)' }}>{perfil?.total ?? 0}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>análises</p>
              </div>
            </div>
          </div>

          {/* Última sessão */}
          <div onClick={() => ultimaVisitada && router.push(`/musica/${ultimaVisitada.id}`)} onMouseMove={ultimaVisitada ? glowMove : undefined} className={ultimaVisitada ? 'tc-glow tc-lift tc-press' : undefined} style={{ background: 'rgba(212,160,23,0.06)', border: '0.5px solid rgba(212,160,23,0.2)', borderRadius: 18, padding: 16, cursor: ultimaVisitada ? 'pointer' : 'default' }}>
            <p style={{ fontSize: 10, color: 'var(--tc-gold)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Última sessão</p>
            {ultimaVisitada ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--tc-txt)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ultimaVisitada.titulo}</p>
                <p style={{ fontSize: 10, color: 'var(--tc-txt2)', marginTop: 2 }}>{ultimaVisitada.artista}</p>
              </>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--tc-txt3)' }}>Nenhuma ainda</p>
            )}
          </div>
        </div>

        {/* Busca na home */}
        <section id="buscar" style={{ marginBottom: 14, scrollMarginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, padding: 4, marginBottom: 8 }}>
            {(['musicas', 'artistas'] as ModoBusca[]).map((modo) => {
              const ativo = modoBusca === modo;
              return (
                <button
                  key={modo}
                  onClick={() => trocarModoBusca(modo)}
                  className="tc-press"
                  style={{ border: 'none', borderRadius: 9, background: ativo ? 'var(--tc-gold)' : 'transparent', color: ativo ? '#0D0D0D' : 'var(--tc-txt2)', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: '9px 10px' }}
                >
                  {modo === 'musicas' ? 'Músicas' : 'Artistas'}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, padding: '10px 14px' }}>
            <Search size={18} style={{ color: 'var(--tc-txt3)', flexShrink: 0 }} />
            <input
              ref={buscaInputRef}
              aria-label={modoBusca === 'artistas' ? 'Buscar artista' : 'Buscar música'}
              value={buscaQuery}
              onChange={handleBuscaChange}
              placeholder={modoBusca === 'artistas' ? 'Buscar artista...' : 'Buscar música...'}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--tc-txt)', fontSize: 14, fontFamily: 'var(--font-ui)', outline: 'none' }}
            />
            {buscaCarregando && (
              <div style={{ width: 16, height: 16, border: '2px solid var(--tc-border)', borderTopColor: 'var(--tc-gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            )}
            {buscaQuery && !buscaCarregando && (
              <button onClick={limparBusca} aria-label="Limpar busca" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt3)', display: 'flex', padding: 0 }}>
                <X size={16} />
              </button>
            )}
          </div>

          {buscaQuery.trim().length === 1 && (
            <p style={{ margin: '8px 2px 0', color: 'var(--tc-txt3)', fontSize: 11 }}>Digite pelo menos 2 letras.</p>
          )}

          {buscaErro && !buscaCarregando && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10, background: 'var(--tc-s1)', border: '0.5px solid rgba(226,75,74,0.35)', borderRadius: 12, padding: '12px 14px' }}>
              <AlertCircle size={17} style={{ color: 'var(--tc-danger)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, color: 'var(--tc-txt2)', fontSize: 12, lineHeight: 1.5 }}>{buscaErro}</p>
            </div>
          )}

          {modoBusca === 'artistas' && artistaSelecionado && !buscaErro && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, background: 'rgba(212,160,23,0.08)', border: '0.5px solid rgba(212,160,23,0.28)', borderRadius: 12, padding: '12px 14px' }}>
              {artistaSelecionado.imagem && (
                <Image
                  src={artistaSelecionado.imagem}
                  alt={`Foto de ${artistaSelecionado.nome}`}
                  width={56}
                  height={56}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '0.5px solid rgba(212,160,23,0.35)' }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: 'var(--tc-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Artista selecionado</p>
                <p style={{ margin: '4px 0 0', color: 'var(--tc-txt)', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artistaSelecionado.nome}</p>
                <p style={{ margin: '2px 0 0', color: 'var(--tc-txt2)', fontSize: 12 }}>{totalMusicasArtista || resultadosBusca.length} músicas encontradas no Cifra Club</p>
              </div>
            </div>
          )}

          {modoBusca === 'artistas' && artistasBusca.length > 1 && !buscaErro && (
            <div style={{ marginTop: 10 }}>
              <StripLabel label="Outros artistas" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {artistasBusca.map((artista) => {
                  const ativo = artistaSelecionado?.slug === artista.slug;
                  return (
                    <button
                      key={artista.slug}
                      onClick={() => selecionarArtista(artista)}
                      className="tc-lift tc-press"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: ativo ? 'rgba(212,160,23,0.12)' : 'var(--tc-s1)', border: ativo ? '0.5px solid rgba(212,160,23,0.35)' : '0.5px solid var(--tc-border)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', color: 'var(--tc-txt)' }}
                    >
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700 }}>{artista.nome}</span>
                      <span style={{ color: ativo ? 'var(--tc-gold)' : 'var(--tc-txt3)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{ativo ? 'Aberto' : 'Ver todas'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {resultadosBusca.length > 0 && !buscaErro && (
            <div style={{ marginTop: 10 }}>
              <StripLabel label={modoBusca === 'artistas' ? 'Músicas do artista' : 'Resultados relevantes'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {resultadosBusca.map((resultado, index) => {
                  const favorito = favoritos.includes(resultado.slug);
                  return (
                    <div
                      key={`${resultado.slug}-${index}`}
                      className="tc-lift"
                      style={{ display: 'flex', alignItems: 'stretch', width: '100%', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, overflow: 'hidden' }}
                    >
                      <button
                        onClick={() => abrirResultadoBusca(resultado)}
                        className="tc-press"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: '12px 10px 12px 14px', cursor: 'pointer', color: 'var(--tc-txt)' }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(212,160,23,0.12)', color: 'var(--tc-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Music size={16} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resultado.titulo}</span>
                          <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--tc-txt2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resultado.artista}</span>
                        </span>
                        <span style={{ flexShrink: 0, color: index === 0 && modoBusca === 'musicas' ? 'var(--tc-gold)' : 'var(--tc-txt3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {modoBusca === 'artistas' ? `#${index + 1}` : index === 0 ? 'Mais relevante' : `#${index + 1}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleFav(resultado.slug, resultado.titulo, resultado.artista)}
                        aria-label={favorito ? `Remover ${resultado.titulo} dos favoritos` : `Favoritar ${resultado.titulo}`}
                        aria-pressed={favorito}
                        className="tc-press"
                        style={{ width: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: favorito ? 'rgba(212,160,23,0.12)' : 'transparent', border: 'none', borderLeft: '0.5px solid var(--tc-border)', color: favorito ? 'var(--tc-gold)' : 'var(--tc-txt3)', cursor: 'pointer' }}
                      >
                        <Heart size={18} fill={favorito ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {buscaFeita && !buscaCarregando && !buscaErro && resultadosBusca.length === 0 && buscaQuery.trim().length >= 2 && (
            <div style={{ textAlign: 'center', marginTop: 10, padding: '24px 18px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--tc-txt)' }}>{modoBusca === 'artistas' ? 'Nenhum artista encontrado' : 'Nenhuma música encontrada'}</p>
              <p style={{ margin: '5px 0 0', color: 'var(--tc-txt2)', fontSize: 12 }}>{modoBusca === 'artistas' ? 'Tente o nome principal do artista no Cifra Club.' : 'Tente outro nome de música ou artista.'}</p>
            </div>
          )}
        </section>

        {/* Favoritas */}
        {favoritosCompletos.length > 0 && (
          <>
            <StripLabel label="Favoritas" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {favoritosCompletos.slice(0, 4).map(f => {
                const titulo  = f.titulo  || f.id.split('/')[1]?.replace(/-/g, ' ') || 'Música';
                const artista = f.artista || f.id.split('/')[0]?.replace(/-/g, ' ') || 'Artista';
                const href    = f.isMock  ? `/musica/${f.id}` : `/musica/${f.slug}`;
                return (
                  <MusicaRow key={f.id} href={href} titulo={titulo} artista={artista}
                    rightSlot={
                      <button onClick={e => { e.preventDefault(); toggleFav(f.id, f.titulo, f.artista); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-gold)', padding: 4 }}>
                        <Heart size={14} fill="currentColor" />
                      </button>
                    }
                  />
                );
              })}
              {favoritosCompletos.length > 4 && (
                <Link href="/favoritas" style={{ fontSize: 12, color: 'var(--tc-gold)', textAlign: 'center', padding: '6px 0', textDecoration: 'none' }}>
                  Ver todas ({favoritosCompletos.length})
                </Link>
              )}
            </div>
          </>
        )}

        {/* Recentes */}
        {visitadas.length > 0 && (
          <>
            <StripLabel label="Acessadas recentemente" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visitadas.slice(0, 6).map(v => (
                <MusicaRow key={v.id} href={`/musica/${v.id}`} titulo={v.titulo} artista={v.artista}
                  rightSlot={
                    <button onClick={e => { e.preventDefault(); toggleFav(v.id, v.titulo, v.artista); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: favoritos.includes(v.id) ? 'var(--tc-gold)' : 'var(--tc-txt3)', padding: 4 }}>
                      <Heart size={14} fill={favoritos.includes(v.id) ? 'currentColor' : 'none'} />
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )}

        {visitadas.length === 0 && favoritosCompletos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--tc-s1)', borderRadius: 20, border: '0.5px solid var(--tc-border)' }}>
            <Music size={48} style={{ color: 'var(--tc-txt3)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma música ainda</p>
            <p style={{ color: 'var(--tc-txt2)', fontSize: 13, lineHeight: 1.6 }}>Busque uma música acima para começar.</p>
          </div>
        )}

        <Link href="/sobre" style={{ display: 'block', textAlign: 'center', marginTop: 18, color: 'var(--tc-txt3)', fontSize: 11, textDecoration: 'none' }}>
          TomCerto criado por <span style={{ color: 'var(--tc-gold)', fontWeight: 700 }}>Fernando Padova</span>
        </Link>
      </div>

      {/* Modal do GravadorDeTom */}
      {gravadorAberto && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setGravadorAberto(false); }}
        >
          <div style={{ background: 'var(--tc-bg)', borderTop: '0.5px solid var(--tc-border)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', pointerEvents: 'auto' }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--tc-border)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--tc-gold)' }}>Detectar Tom</p>
                <p style={{ fontSize: 12, color: 'var(--tc-txt2)', marginTop: 2 }}>Cante um trecho da música por ~6 segundos</p>
              </div>
              <button onClick={() => setGravadorAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt3)', display: 'flex', padding: 4, flexShrink: 0 }}>
                <X size={20} />
              </button>
            </div>
            <GravadorDeTom onTomDetectado={handleTomDetectado} />
          </div>
        </div>
      )}

      <BottomNav />
      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </div>
  );
}

function StripLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
      {[...Array(4)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
      <span style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 8px' }}>{label}</span>
      {[...Array(4)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
    </div>
  );
}

function MusicaRow({ href, titulo, artista, rightSlot }: { href: string; titulo: string; artista: string; rightSlot?: React.ReactNode }) {
  return (
    <Link href={href} className="tc-lift tc-press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 12, textDecoration: 'none' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tc-gold)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</p>
        <p style={{ fontSize: 11, color: 'var(--tc-txt2)' }}>{artista}</p>
      </div>
      {rightSlot}
    </Link>
  );
}
