// app/components/Afinador.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectarPitchAutocorrelacao } from '@/lib/pitch-detection';
import {
  compararComCordaMaisProxima,
  ResultadoAfinacao,
} from '@/lib/guitar-tuning';
import Modal from '@/app/components/ui/Modal';

interface AfinadorProps {
  aberto: boolean;
  onFechar: () => void;
}

/**
 * Afinador de violão em tempo real. Reaproveita a MESMA engine de
 * autocorrelação validada para detecção de voz, mas com lógica de
 * comparação própria: aqui não buscamos "qual é a nota geral cantada",
 * buscamos "essa frequência está em cima de uma das 6 cordas do violão,
 * e quão afinada está". São perguntas diferentes sobre o mesmo sinal.
 */
export default function Afinador({ aberto, onFechar }: AfinadorProps) {
  const [escutando, setEscutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAfinacao | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessaoRef = useRef(0);

  const pararEscuta = useCallback(() => {
    sessaoRef.current += 1;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    setEscutando(false);
    setResultado(null);
  }, []);

  const loop = useCallback(function analisar() {
    const analyser = analyserRef.current;
    const audioContext = audioContextRef.current;
    if (!analyser || !audioContext) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const deteccao = detectarPitchAutocorrelacao(buffer, audioContext.sampleRate);
    if (deteccao.frequencia > 0 && deteccao.confianca > 0.4) {
      setResultado(compararComCordaMaisProxima(deteccao.frequencia));
    }

    animationFrameRef.current = requestAnimationFrame(analisar);
  }, []);

  const iniciarEscuta = useCallback(async () => {
    const sessao = ++sessaoRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (sessao !== sessaoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // janela maior - cordas graves precisam de mais resolução

      const fonte = audioContext.createMediaStreamSource(stream);
      fonte.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setEscutando(true);
      loop();
    } catch {
      if (sessao === sessaoRef.current) {
        setEscutando(false);
      }
    }
  }, [loop]);

  useEffect(() => {
    if (aberto) void iniciarEscuta();
    else pararEscuta();
    return pararEscuta;
  }, [aberto, iniciarEscuta, pararEscuta]);

  const corStatus =
    resultado?.status === 'afinada'
      ? '#22c55e' // verde
      : resultado?.status === 'um_pouco_desafinada'
        ? '#eab308' // amarelo
        : '#ef4444'; // vermelho

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Afinador de violão">
      <div className="flex flex-col items-center py-6">
        {!resultado ? (
          <p className="text-center text-sm text-text-dim">
            {escutando ? 'Toque uma corda...' : 'Iniciando microfone...'}
          </p>
        ) : (
          <>
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-4xl font-bold text-white transition-all duration-300"
              style={{ backgroundColor: corStatus, boxShadow: `0 0 40px ${corStatus}80` }}
            >
              {resultado.corda.nome}
            </div>
            <p className="mt-3 text-sm text-text-dim">Corda {resultado.corda.numero}</p>

            {/* Indicador visual de desvio: ponteiro deslocando para grave/agudo */}
            <div className="relative mt-5 h-2 w-56 rounded-full bg-bg-soft">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: corStatus,
                  left: `calc(50% + ${Math.max(-100, Math.min(100, resultado.centsDeDesvio)) * 1}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
            <p className="mt-3 text-sm font-medium transition-colors duration-300" style={{ color: corStatus }}>
              {resultado.status === 'afinada'
                ? 'Afinada!'
                : resultado.centsDeDesvio < 0
                  ? 'Grave — aperte um pouco'
                  : 'Aguda — afrouxe um pouco'}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
