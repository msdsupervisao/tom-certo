'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectarPitchAutocorrelacao } from '@/lib/pitch-detection';
import { compararComCordaMaisProxima, ResultadoAfinacao } from '@/lib/guitar-tuning';
import BottomNav from '@/app/components/BottomNav';
import { ArrowLeft } from 'lucide-react';

export default function AfinadorPage() {
  const router = useRouter();
  const [escutando, setEscutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAfinacao | null>(null);
  const [erro, setErro] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const rafRef          = useRef<number | null>(null);

  useEffect(() => {
    return () => encerrarAudio();
  }, []);

  function encerrarAudio() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  }

  async function iniciar() {
    if (escutando) return;
    setErro('');
    setResultado(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setEscutando(true);
      loop();
    } catch {
      encerrarAudio();
      setEscutando(false);
      setErro('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }

  function parar() {
    encerrarAudio();
    setEscutando(false);
    setResultado(null);
  }

  function loop() {
    const analyser = analyserRef.current;
    const ctx      = audioContextRef.current;
    if (!analyser || !ctx) return;

    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const det = detectarPitchAutocorrelacao(buf, ctx.sampleRate);
    if (det.frequencia > 0 && det.confianca > 0.4) {
      setResultado(compararComCordaMaisProxima(det.frequencia));
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  const corCss = resultado?.status === 'afinada'
    ? 'var(--turquesa)'
    : resultado?.status === 'um_pouco_desafinada'
      ? 'var(--amarelo)'
      : 'var(--rosa)';

  const desvio = resultado ? Math.max(-100, Math.min(100, resultado.centsDeDesvio)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)', fontFamily: 'var(--font-ui)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px', borderBottom: '0.5px solid var(--tc-border)', flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt2)', display: 'flex', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--tc-gold)' }}>Afinador</span>
        <span style={{ fontSize: 11, color: 'var(--tc-txt3)', marginLeft: 4 }}>de violão</span>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 80px' }}>

        {erro ? (
          <div style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--tc-danger)', fontSize: 14, lineHeight: 1.6 }}>{erro}</p>
            <button onClick={iniciar} style={{ marginTop: 16, border: 'none', borderRadius: 999, background: 'var(--tc-gold)', color: '#0D0D0D', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 16px' }}>
              Tentar novamente
            </button>
          </div>
        ) : !resultado ? (
          <>
            {/* Pulsing mic indicator */}
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--tc-s1)', border: `2px solid ${escutando ? 'var(--tc-gold)' : 'var(--tc-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, transition: 'border-color 0.3s' }}>
              <svg width="36" height="36" fill="none" stroke={escutando ? 'var(--tc-gold)' : 'var(--tc-txt3)'} strokeWidth="1.5" viewBox="0 0 24 24" style={{ transition: 'stroke 0.3s' }}>
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, color: 'var(--tc-txt2)', textAlign: 'center' }}>
              {escutando ? 'Toque uma corda do violão...' : 'Toque em iniciar para liberar o microfone.'}
            </p>
            <button onClick={escutando ? parar : iniciar} style={{ marginTop: 18, border: 'none', borderRadius: 999, background: escutando ? 'var(--tc-s2)' : 'var(--tc-gold)', color: escutando ? 'var(--tc-txt)' : '#0D0D0D', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 18px' }}>
              {escutando ? 'Parar microfone' : 'Iniciar afinador'}
            </button>
          </>
        ) : (
          <>
            {/* Corda detectada */}
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: corCss, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 8, boxShadow: `0 0 40px ${corCss}50` }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{resultado.corda.nome}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--tc-txt3)', marginBottom: 28 }}>Corda {resultado.corda.numero}</p>

            {/* Indicador de desvio */}
            <div style={{ position: 'relative', width: 220, height: 8, background: 'var(--tc-s2)', borderRadius: 4, marginBottom: 12 }}>
              {/* Centro */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--tc-border)', transform: 'translateX(-50%)' }} />
              {/* Ponteiro */}
              <div style={{
                position: 'absolute', top: '50%', width: 16, height: 16, borderRadius: '50%',
                background: corCss,
                left: `calc(50% + ${desvio}px)`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.15s ease, background-color 0.3s',
                boxShadow: `0 0 8px ${corCss}80`,
              }} />
            </div>

            {/* Labels grave / centro / aguda */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 220, marginBottom: 20 }}>
              <span style={{ fontSize: 10, color: 'var(--tc-txt3)' }}>Grave</span>
              <span style={{ fontSize: 10, color: 'var(--tc-txt3)' }}>Aguda</span>
            </div>

            <p style={{ fontSize: 15, fontWeight: 600, color: corCss, textAlign: 'center' }}>
              {resultado.status === 'afinada'
                ? 'Afinada!'
                : resultado.centsDeDesvio < 0
                  ? 'Grave — aperte um pouco'
                  : 'Aguda — afrouxe um pouco'}
            </p>
            <button onClick={parar} style={{ marginTop: 18, border: 'none', borderRadius: 999, background: 'var(--tc-s2)', color: 'var(--tc-txt)', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '11px 18px' }}>
              Parar microfone
            </button>
          </>
        )}

        {/* Referência das cordas */}
        <div style={{ marginTop: 48, background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 16, padding: '14px 20px', width: '100%', maxWidth: 320 }}>
          <p style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Afinação padrão (E A D G B e)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {[
              { n: '6ª', nota: 'E2' }, { n: '5ª', nota: 'A2' }, { n: '4ª', nota: 'D3' },
              { n: '3ª', nota: 'G3' }, { n: '2ª', nota: 'B3' }, { n: '1ª', nota: 'E4' },
            ].map(c => (
              <div key={c.n} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--tc-gold)' }}>{c.nota.replace(/\d/, '')}</p>
                <p style={{ fontSize: 9, color: 'var(--tc-txt3)', marginTop: 2 }}>{c.n}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
