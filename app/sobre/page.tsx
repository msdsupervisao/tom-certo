import Link from 'next/link';
import { ArrowLeft, Heart, Info, Mic, Music, Search, SlidersHorizontal } from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';

const UI = {
  bg: 'var(--tc-bg, #0D0D0D)',
  panel: 'var(--tc-s1, #171717)',
  panelSoft: 'var(--tc-gold-dim, rgba(212,160,23,0.14))',
  gold: 'var(--tc-gold, #D4A017)',
  goldSoft: 'var(--tc-gold-dim, rgba(212,160,23,0.14))',
  goldBorder: 'var(--tc-gold-border, rgba(212,160,23,0.34))',
  text: 'var(--tc-txt, #F0EDE6)',
  text2: 'var(--tc-txt2, #C7BDB3)',
  text3: 'var(--tc-txt3, #867B70)',
  border: 'var(--tc-border, rgba(255,255,255,0.09))',
};

const recursos = [
  {
    icon: <Search size={18} />,
    titulo: 'Buscar cifras',
    texto: 'Encontre músicas por nome ou artista e abra a cifra para tocar.',
  },
  {
    icon: <Mic size={18} />,
    titulo: 'Cantar para ajustar',
    texto: 'Cante um trecho da música para estimar sua tonalidade. Confira a sugestão cantando com a cifra.',
  },
  {
    icon: <Music size={18} />,
    titulo: 'Meu tom por música',
    texto: 'Salve o tom, a fonte e as preferências de leitura de cada música neste navegador.',
  },
  {
    icon: <SlidersHorizontal size={18} />,
    titulo: 'Ajustar a cifra',
    texto: 'Transponha meio tom para cima ou para baixo até ficar confortável.',
  },
  {
    icon: <Heart size={18} />,
    titulo: 'Salvar favoritas',
    texto: 'Guarde músicas importantes para voltar rápido depois.',
  },
];

export default function SobrePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: UI.bg, color: UI.text, fontFamily: 'var(--font-ui)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 10px', borderBottom: `0.5px solid ${UI.border}`, flexShrink: 0 }}>
        <Link href="/" aria-label="Voltar para início" style={{ width: 44, height: 44, borderRadius: 12, background: UI.panel, border: `0.5px solid ${UI.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: UI.text2, textDecoration: 'none', flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: UI.gold, margin: 0 }}>Sobre o TomCerto</p>
          <p style={{ fontSize: 11, color: UI.text3, margin: '2px 0 0' }}>Um tom confortável para cada música</p>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 88px' }}>
        <section style={{ background: UI.panelSoft, border: `1px solid ${UI.goldBorder}`, borderRadius: 18, padding: 18, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: UI.gold, color: UI.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Music size={21} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.05, fontWeight: 700, margin: 0, color: UI.text }}>
            TomCerto
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: UI.text2, margin: '10px 0 0' }}>
            Um app para quem toca e canta encontrar cifras no tom certo, ajustar a tonalidade sem complicação e manter por perto as músicas mais importantes.
          </p>
        </section>

        <section style={{ background: UI.panel, border: `0.5px solid ${UI.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: UI.gold, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Criador</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: UI.text, margin: 0 }}>Fernando Padova</p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: UI.text2, margin: '8px 0 0' }}>
            O TomCerto foi criado para transformar uma dificuldade comum de músicos: achar uma cifra boa e adaptar rapidamente para o tom que combina com a voz.
          </p>
        </section>

        <section style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {recursos.map((item) => (
            <div key={item.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: UI.panel, border: `0.5px solid ${UI.border}`, borderRadius: 12, padding: '13px 14px' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: UI.goldSoft, color: UI.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: UI.text, margin: 0 }}>{item.titulo}</p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: UI.text2, margin: '3px 0 0' }}>{item.texto}</p>
              </span>
            </div>
          ))}
        </section>

        <section style={{ background: UI.panel, border: `0.5px solid ${UI.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Info size={16} style={{ color: UI.gold }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: UI.text, margin: 0 }}>Para quem é</p>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: UI.text2, margin: 0 }}>
            Para cantores, violonistas, estudantes e músicos que precisam adaptar músicas de forma prática, principalmente em estudo, ensaio, igreja, bares e apresentações ao vivo.
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
