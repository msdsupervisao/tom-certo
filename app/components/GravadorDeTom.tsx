// app/components/GravadorDeTom.tsx
'use client';

import { useRef, useState } from 'react';
import {
  detectarPitch,
  calcularTomPredominante,
  type AmostraDeTom,
} from '@/lib/pitch-detection';
import { frequenciaParaNota, NomeNota } from '@/lib/music-theory';

interface GravadorDeTomProps {
  onTomDetectado: (nota: NomeNota, estabilidade: number) => void;
}

type Estado = 'ocioso' | 'gravando' | 'processando' | 'resultado';

/**
 * Componente de captura: grava ~6 segundos de áudio, roda a detecção
 * de pitch em tempo real, e ao final calcula a nota mais ESTÁVEL
 * (moda das amostras), não um instante isolado. Isso é o que mitiga
 * a faixa de 70-90% de acerto medida no teste: se uma amostra falhar,
 * as outras 100+ no histórico ainda carregam o resultado.
 *
 * Quando a estabilidade fica baixa, o usuário recebe feedback claro
 * em vez do app cravar um tom errado silenciosamente.
 */
export default function GravadorDeTom({ onTomDetectado }: GravadorDeTomProps) {
  const [estado, setEstado] = useState<Estado>('ocioso');
  const [nivelSinal, setNivelSinal] = useState(0);
  const [avisoBaixaConfianca, setAvisoBaixaConfianca] = useState(false);
  const [erroMicrofone, setErroMicrofone] = useState('');
  // Medidor ao vivo (feedback + calibração no aparelho real).
  const [notaAtual, setNotaAtual] = useState('');
  const [clarityAtual, setClarityAtual] = useState(0);
  const [amostrasAceitas, setAmostrasAceitas] = useState(0);
  // Resultado final visível (nota + estabilidade), para o usuário confirmar.
  const [resultadoFinal, setResultadoFinal] = useState<{ nota: NomeNota; estabilidade: number } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historicoNotasRef = useRef<AmostraDeTom[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DURACAO_GRAVACAO_MS = 6000;
  const LIMIAR_ESTABILIDADE_ACEITAVEL = 30; // abaixo disso, avisa o usuário
  // Piso de clarity para um quadro entrar na votação. Baixo de propósito: a
  // votação já é PONDERADA pela clarity, então quadros mais limpos pesam mais
  // sem descartar voz real de mic de celular (que raramente passa de ~0.85).
  const CLARITY_MINIMA_QUADRO = 0.5;

  async function iniciarGravacao() {
    try {
      setAvisoBaixaConfianca(false);
      setErroMicrofone('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Sinal cru é o melhor para pitch: qualquer processamento (eco/ruído/
          // ganho) pode adicionar artefato e derrubar a clarity. O MPM é
          // normalizado por energia, então funciona bem mesmo em nível baixo.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      // 4096 amostras (~93ms @ 44.1kHz): janela longa o bastante para firmar
      // as vozes graves (~80-110Hz precisam de 2-3 períodos).
      analyser.fftSize = 4096;

      const microfone = audioContext.createMediaStreamSource(stream);
      microfone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      historicoNotasRef.current = [];
      setNotaAtual('');
      setClarityAtual(0);
      setAmostrasAceitas(0);

      setEstado('gravando');
      loopDeAnalise();

      timeoutRef.current = setTimeout(() => {
        finalizarGravacao();
      }, DURACAO_GRAVACAO_MS);
    } catch {
      setEstado('ocioso');
      setErroMicrofone('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }

  function loopDeAnalise() {
    const analyser = analyserRef.current;
    const audioContext = audioContextRef.current;
    if (!analyser || !audioContext) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const resultado = detectarPitch(buffer, audioContext.sampleRate);

    let pico = 0;
    for (let i = 0; i < buffer.length; i++) {
      pico = Math.max(pico, Math.abs(buffer[i]));
    }
    setNivelSinal(Math.min(pico * 300, 100));

    // Guardamos a CLASSE DE TOM (sem oitava) — para um erro de oitava residual
    // não dividir o voto — e a clarity, para ponderar. Quadros abaixo do piso
    // são ignorados; os que entram já alimentam o medidor ao vivo.
    if (resultado.motivo === 'ok') {
      const nota = frequenciaParaNota(resultado.frequencia);
      if (nota) {
        setNotaAtual(nota.nome);
        setClarityAtual(resultado.confianca);
        if (resultado.confianca >= CLARITY_MINIMA_QUADRO) {
          historicoNotasRef.current.push({ nota: nota.nome, confianca: resultado.confianca });
          setAmostrasAceitas(historicoNotasRef.current.length);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(loopDeAnalise);
  }

  function finalizarGravacao() {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();

    setEstado('processando');

    const resultado = calcularTomPredominante(historicoNotasRef.current);

    if (!resultado) {
      setResultadoFinal(null);
      setAvisoBaixaConfianca(true);
      setEstado('ocioso');
      return;
    }

    // resultado.nota já é a classe de tom (sem oitava), ex.: "G", "C#".
    // Não decidimos sozinhos: mostramos o que foi detectado + a estabilidade
    // e deixamos o usuário confirmar (Aplicar) ou cantar de novo.
    setResultadoFinal({ nota: resultado.nota as NomeNota, estabilidade: resultado.estabilidadePercentual });
    setAvisoBaixaConfianca(false);
    setEstado('resultado');
  }

  function pararManualmente() {
    finalizarGravacao();
  }

  function aplicarResultado() {
    if (resultadoFinal) onTomDetectado(resultadoFinal.nota, resultadoFinal.estabilidade);
  }

  function cantarDeNovo() {
    setResultadoFinal(null);
    setAvisoBaixaConfianca(false);
    setEstado('ocioso');
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      {estado === 'ocioso' && (
        <button
          onClick={iniciarGravacao}
          className="w-full rounded-xl bg-violeta py-4 text-base font-semibold text-white transition hover:opacity-90"
        >
          🎙️ Cantar para ajustar o tom
        </button>
      )}

      {estado === 'gravando' && (
        <div>
          <button
            onClick={pararManualmente}
            className="w-full rounded-xl bg-rosa py-4 text-base font-semibold text-white transition hover:opacity-90"
          >
            ⏹️ Cantando... toque para parar
          </button>
          <Equalizador nivel={nivelSinal} />
          <div className="mt-3 flex items-center justify-center gap-4 text-center">
            <div>
              <p className="font-display text-3xl font-bold" style={{ color: 'var(--tc-gold)', minWidth: 40 }}>
                {notaAtual || '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-dim">nota</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: clarityAtual >= 0.5 ? 'var(--turquesa)' : 'var(--tc-txt3)' }}>
                {Math.round(clarityAtual * 100)}%
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-dim">clareza</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--tc-txt2)' }}>
                {amostrasAceitas}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-dim">amostras</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-text-dim">
            Segure <strong>uma nota só</strong> (ex.: cante &quot;aaah&quot;) num tom confortável. A nota e a clareza aparecem acima em tempo real.
          </p>
        </div>
      )}

      {estado === 'processando' && (
        <div className="py-4 text-center text-sm text-text-dim">
          Identificando o tom...
        </div>
      )}

      {estado === 'resultado' && resultadoFinal && (
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-dim">Tom detectado</p>
          <p className="font-display text-6xl font-bold" style={{ color: 'var(--tc-gold)', lineHeight: 1.1 }}>
            {resultadoFinal.nota}
          </p>
          <p className="mt-1 text-sm" style={{ color: resultadoFinal.estabilidade >= LIMIAR_ESTABILIDADE_ACEITAVEL ? 'var(--turquesa)' : 'var(--amarelo)' }}>
            estabilidade {resultadoFinal.estabilidade}%
          </p>
          {resultadoFinal.estabilidade < LIMIAR_ESTABILIDADE_ACEITAVEL && (
            <p className="mx-auto mt-2 max-w-xs text-xs text-text-dim">
              A voz variou bastante. Para um resultado firme, segure <strong>uma nota só</strong> (sem melodia) por alguns segundos.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={aplicarResultado}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
              style={{ background: 'var(--tc-gold)', color: '#0D0D0D' }}
            >
              Aplicar tom {resultadoFinal.nota}
            </button>
            <button
              onClick={cantarDeNovo}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-text-dim transition hover:bg-bg-soft active:scale-95"
            >
              Cantar de novo
            </button>
          </div>
        </div>
      )}

      {erroMicrofone && (
        <div className="mt-3 rounded-xl bg-bad/10 p-3 text-sm text-bad">
          {erroMicrofone}
        </div>
      )}

      {avisoBaixaConfianca && (
        <div className="mt-3 rounded-xl bg-bad/10 p-3 text-sm text-bad">
          Não conseguimos identificar bem o tom dessa vez. Tente cantar mais
          firme, em um ambiente mais silencioso, ou aproxime-se do microfone.
        </div>
      )}
    </div>
  );
}

/**
 * Equalizador visual: barras que respondem ao nível do sinal de áudio
 * em tempo real. É a assinatura visual do app - comunica literalmente
 * "estou ouvindo sua voz agora", em vez de uma barra de progresso genérica.
 */
function Equalizador({ nivel }: { nivel: number }) {
  const barras = 9;
  const cores = ['rosa', 'violeta', 'turquesa', 'amarelo'];

  return (
    <div className="mt-4 flex h-12 items-center justify-center gap-1.5">
      {Array.from({ length: barras }).map((_, i) => {
        const distanciaDoCentro = Math.abs(i - (barras - 1) / 2);
        const fatorAltura = Math.max(0.15, 1 - distanciaDoCentro * 0.18);
        const alturaBase = Math.max(8, nivel * fatorAltura * 0.48);
        const cor = cores[i % cores.length];

        return (
          <div
            key={i}
            className="w-2 rounded-full transition-all duration-75"
            style={{
              height: `${alturaBase}px`,
              minHeight: '6px',
              maxHeight: '48px',
              backgroundColor: `var(--${cor})`,
            }}
          />
        );
      })}
    </div>
  );
}
