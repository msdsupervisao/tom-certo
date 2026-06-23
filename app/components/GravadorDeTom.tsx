// app/components/GravadorDeTom.tsx
'use client';

import { useRef, useState } from 'react';
import {
  detectarPitchAutocorrelacao,
  calcularNotaMaisEstavel,
  classificarConfianca,
} from '@/lib/pitch-detection';
import { frequenciaParaNota, NomeNota } from '@/lib/music-theory';

interface GravadorDeTomProps {
  onTomDetectado: (nota: NomeNota, estabilidade: number) => void;
}

type Estado = 'ocioso' | 'gravando' | 'processando';

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historicoNotasRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DURACAO_GRAVACAO_MS = 6000;
  const LIMIAR_ESTABILIDADE_ACEITAVEL = 40; // abaixo disso, avisa o usuário

  async function iniciarGravacao() {
    try {
      setAvisoBaixaConfianca(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      const microfone = audioContext.createMediaStreamSource(stream);
      microfone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      historicoNotasRef.current = [];

      setEstado('gravando');
      loopDeAnalise();

      timeoutRef.current = setTimeout(() => {
        finalizarGravacao();
      }, DURACAO_GRAVACAO_MS);
    } catch (erro) {
      alert(
        'Não foi possível acessar o microfone. Verifique as permissões do navegador.'
      );
    }
  }

  function loopDeAnalise() {
    const analyser = analyserRef.current;
    const audioContext = audioContextRef.current;
    if (!analyser || !audioContext) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const resultado = detectarPitchAutocorrelacao(buffer, audioContext.sampleRate);

    let pico = 0;
    for (let i = 0; i < buffer.length; i++) {
      pico = Math.max(pico, Math.abs(buffer[i]));
    }
    setNivelSinal(Math.min(pico * 300, 100));

    if (resultado.frequencia > 0) {
      const nota = frequenciaParaNota(resultado.frequencia);
      if (nota) {
        historicoNotasRef.current.push(nota.nome + nota.oitava);
        if (historicoNotasRef.current.length > 60) {
          historicoNotasRef.current.shift();
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

    const resultado = calcularNotaMaisEstavel(historicoNotasRef.current);

    if (!resultado) {
      setAvisoBaixaConfianca(true);
      setEstado('ocioso');
      return;
    }

    // Remove o número da oitava, mantendo só o nome da nota (ex: "G4" -> "G")
    const nomeNotaSemOitava = resultado.nota.replace(/[0-9]/g, '') as NomeNota;

    if (resultado.estabilidadePercentual < LIMIAR_ESTABILIDADE_ACEITAVEL) {
      setAvisoBaixaConfianca(true);
      setEstado('ocioso');
      return;
    }

    setEstado('ocioso');
    onTomDetectado(nomeNotaSemOitava, resultado.estabilidadePercentual);
  }

  function pararManualmente() {
    finalizarGravacao();
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
          <p className="mt-1 text-center text-xs text-text-dim">
            Cante um trecho da música por alguns segundos
          </p>
        </div>
      )}

      {estado === 'processando' && (
        <div className="py-4 text-center text-sm text-text-dim">
          Identificando o tom...
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
