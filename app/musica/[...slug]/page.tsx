'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { calcularIntervaloSemitons, transporCifraCompleta, NomeNota, NOMES_NOTAS } from '@/lib/music-theory';
import { registrarDeteccao, ehFavorito, registrarVisita } from '@/lib/historico-local';
import { salvarENotificar } from '@/lib/storage-events';
import CifraViewer from '@/app/components/CifraViewer';
import GravadorDeTom from '@/app/components/GravadorDeTom';
import Afinador from '@/app/components/Afinador';
import ControleFonte from '@/app/components/ControleFonte';

interface CifraResult {
  titulo: string;
  artista: string;
  tomOriginal: string;
  cifra: string;
  slug: string;
}

export default function MusicaSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slugParts = Array.isArray(params.slug) ? params.slug : [params.slug as string];
  const slug = slugParts.join('/');

  const [cifraData, setCifraData] = useState<CifraResult | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tomDetectado, setTomDetectado] = useState<NomeNota | null>(null);
  const [estabilidade, setEstabilidade] = useState<number | null>(null);
  const [ajusteManual, setAjusteManual] = useState(0); // semitons extras além do detectado
  const [afinadorAberto, setAfinadorAberto] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(15);
  const [favorito, setFavorito] = useState(false);
  const [mostrarGravador, setMostrarGravador] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setCarregando(true);
    setErro(null);
    fetch(`/api/cifra?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) setErro(data.erro);
        else {
          setCifraData(data);
          setFavorito(ehFavorito(slug));
          registrarVisita(slug, data.titulo, data.artista);
        }
      })
      .catch(() => setErro('Falha ao carregar. Verifique sua conexão.'))
      .finally(() => setCarregando(false));
  }, [slug]);

  function toggleFavorito() {
    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      const atual = raw ? JSON.parse(raw) : [];
      const existe = atual.some((x: any) => (typeof x === 'string' ? x : x.id) === slug);
      const nova = existe
        ? atual.filter((x: any) => (typeof x === 'string' ? x : x.id) !== slug)
        : [...atual, { id: slug, titulo: cifraData?.titulo, artista: cifraData?.artista }];
      salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
      setFavorito(!existe);
    } catch {}
  }

  if (carregando) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border border-t-violeta" />
          <p className="mt-4 text-sm text-text-dim">Carregando cifra...</p>
        </div>
      </main>
    );
  }

  if (erro || !cifraData) {
    return (
      <main>
        <button onClick={() => router.back()} className="mb-4 text-sm text-text-dim">← Voltar</button>
        <div className="rounded-2xl border border-red-500/30 bg-panel p-6 text-center">
          <p className="text-red-400">{erro || 'Cifra não encontrada.'}</p>
        </div>
      </main>
    );
  }

  const semitons = tomDetectado
    ? calcularIntervaloSemitons(cifraData.tomOriginal as NomeNota, tomDetectado) + ajusteManual
    : ajusteManual;
  const cifraExibida = semitons !== 0
    ? transporCifraCompleta(cifraData.cifra, semitons)
    : cifraData.cifra;

  // Calcula o tom atual para exibir com cor (igual ao Cifra Club)
  const indiceOriginal = NOMES_NOTAS.indexOf(cifraData.tomOriginal as NomeNota);
  const tomAtual = indiceOriginal >= 0
    ? NOMES_NOTAS[((indiceOriginal + semitons) % 12 + 12) % 12]
    : cifraData.tomOriginal;
  const corEstabilidade = estabilidade !== null && estabilidade >= 70 ? 'turquesa' : 'amarelo';

  function handleTomDetectado(nota: NomeNota, est: number) {
    setTomDetectado(nota);
    setEstabilidade(est);
    setMostrarGravador(false);
    registrarDeteccao(slug, nota, est);
  }

  return (
    <main>
      {/* Barra de controles */}
      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-text-dim">← Voltar</button>
        <div className="flex items-center gap-2">
          <button onClick={toggleFavorito}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            title="Favoritar">
            {favorito ? '❤️' : '🤍'}
          </button>
          <ControleFonte
            tamanho={tamanhoFonte}
            onAumentar={() => setTamanhoFonte(t => Math.min(24, t + 1))}
            onDiminuir={() => setTamanhoFonte(t => Math.max(12, t - 1))}
          />
          <button onClick={() => setAfinadorAberto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            title="Afinador">🎸</button>
          <button onClick={() => window.print()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-panel"
            title="Imprimir/PDF">🖨️</button>
        </div>
      </div>

      {/* Título */}
      <div className="no-print mb-4">
        <h1 className="font-display text-2xl font-bold">{cifraData.titulo}</h1>
        <p className="text-sm text-text-dim">{cifraData.artista}</p>
      </div>

      {/* Tom colorido — igual ao Cifra Club */}
      <div className="no-print mb-3">
        <span className="text-sm text-text-dim">Tom: </span>
        <span className="text-sm font-bold text-violeta">{tomAtual}</span>
        {semitons !== 0 && (
          <span className="ml-2 text-xs text-text-dim">({semitons > 0 ? '+' : ''}{semitons} st do original)</span>
        )}
      </div>

      {/* Controles de tom e cantar */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        {/* Controle manual de tom */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-panel px-2 py-1">
          <button onClick={() => setAjusteManual(a => a - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-text-dim hover:bg-bg-soft">−</button>
          <span className="min-w-[32px] text-center text-xs font-medium text-text-dim">½ Tom</span>
          <button onClick={() => setAjusteManual(a => a + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-text-dim hover:bg-bg-soft">+</button>
          {semitons !== 0 && (
            <button onClick={() => { setAjusteManual(0); setTomDetectado(null); setEstabilidade(null); }}
              className="ml-1 text-xs text-text-dim hover:text-text" title="Resetar">↺</button>
          )}
        </div>

        {!mostrarGravador && !tomDetectado && (
          <button onClick={() => setMostrarGravador(true)}
            className="flex items-center gap-2 rounded-full bg-violeta px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            🎤 Cantar para ajustar o tom
          </button>
        )}
        {tomDetectado && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-1.5">
            <span className="flex items-center gap-2 text-sm text-text-dim">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--${corEstabilidade})` }} />
              Estabilidade: {estabilidade}%
            </span>
            <button onClick={() => { setTomDetectado(null); setEstabilidade(null); setMostrarGravador(false); setAjusteManual(0); }}
              className="text-sm font-medium text-violeta">Cantar de novo</button>
          </div>
        )}
      </div>

      {/* Gravador — aparece inline acima da cifra quando ativo */}
      {mostrarGravador && (
        <div className="no-print mb-4">
          <GravadorDeTom onTomDetectado={handleTomDetectado} />
        </div>
      )}

      {/* Cifra — ocupa toda a largura */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold">{cifraData.titulo}</h1>
        <p className="text-sm">{cifraData.artista} — Tom: {tomDetectado || cifraData.tomOriginal}</p>
      </div>
      <CifraViewer cifra={cifraExibida} tamanhoFonte={tamanhoFonte} />

      <Afinador aberto={afinadorAberto} onFechar={() => setAfinadorAberto(false)} />
    </main>
  );
}
