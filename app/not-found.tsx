'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)',
      fontFamily: 'var(--font-ui)', padding: '24px 20px', textAlign: 'center',
    }}>
      {/* Logo */}
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)', letterSpacing: -0.5, marginBottom: 40 }}>
        Tom<span style={{ color: 'var(--tc-txt3)', fontWeight: 500 }}>Certo</span>
      </span>

      {/* 404 display */}
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700, color: 'var(--tc-gold)', lineHeight: 1, letterSpacing: -4, margin: '0 0 8px' }}>
        404
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--tc-txt)', marginBottom: 10 }}>
        Página não encontrada
      </p>
      <p style={{ fontSize: 14, color: 'var(--tc-txt2)', maxWidth: 300, lineHeight: 1.6, marginBottom: 36 }}>
        Essa página não existe ou foi removida. Tente voltar para o início.
      </p>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 320, marginBottom: 28 }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
        <span style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 8px' }}>O que fazer?</span>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--tc-gold)', color: '#0D0D0D',
          padding: '13px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14,
          textDecoration: 'none',
        }}>
          Voltar ao início
        </Link>
        <Link href="/#buscar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--tc-s1)', color: 'var(--tc-txt)',
          border: '0.5px solid var(--tc-border)',
          padding: '12px 24px', borderRadius: 12, fontWeight: 500, fontSize: 14,
          textDecoration: 'none',
        }}>
          Buscar uma música
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
