import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Tom Certo — Cifras no seu tom',
  description: 'Busque uma cifra, cante um trecho e encontre um tom confortável para a música. Salve seus ajustes para o próximo ensaio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tom Certo',
  },
};

export const viewport: Viewport = {
  themeColor: '#D4A017',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('tom-certo:tema');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="theme-color" content="#D4A017" />
        <meta name="apple-mobile-web-app-title" content="Tom Certo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            color-scheme: dark;
            --tc-bg: #0D0D0D;
            --tc-s1: #1A1A1A;
            --tc-s2: #222222;
            --tc-s3: #2A2A2A;
            --tc-gold: #D4A017;
            --tc-gold-dim: rgba(212,160,23,0.12);
            --tc-gold-border: rgba(212,160,23,0.30);
            --tc-txt: #F0EDE6;
            --tc-txt2: #A09890;
            --tc-txt3: #8A8178;
            --tc-border: rgba(255,255,255,0.07);
            --tc-danger: #E24B4A;
            --tc-nav-bg: rgba(20,20,20,0.97);
            --tc-nav-border: rgba(255,255,255,0.07);
            --tc-nav-muted: #A09890;
            --font-display: 'Playfair Display', Georgia, serif;
            --font-ui: 'Inter', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
            --bg: var(--tc-bg);
            --bg-soft: var(--tc-s1);
            --panel: var(--tc-s2);
            --text: var(--tc-txt);
            --text-dim: var(--tc-txt2);
            --border: var(--tc-border);
            --color-primary: #ff5d8f;
            --color-primary-hover: #ff3d78;
            --color-secondary: var(--tc-gold);
            --color-secondary-hover: #b8880f;
            --color-success: #2dd4bf;
            --color-warning: var(--tc-gold);
            --color-error: var(--tc-danger);
            --rosa: #ff5d8f;
            --amarelo: var(--tc-gold);
            --violeta: var(--tc-gold);
            --turquesa: #2dd4bf;
          }
          [data-theme='light'] {
            color-scheme: light;
            --tc-bg: #F5F0E8;
            --tc-s1: #EDE8DC;
            --tc-s2: #E5DFD0;
            --tc-s3: #DDD7C8;
            --tc-txt: #1A1612;
            --tc-txt2: #4A4238;
            --tc-txt3: #8A7D6E;
            --tc-border: rgba(0,0,0,0.08);
            --tc-nav-bg: rgba(245,240,232,0.97);
            --tc-nav-border: rgba(0,0,0,0.10);
            --tc-nav-muted: #6B625A;
            --bg: var(--tc-bg);
            --bg-soft: var(--tc-s1);
            --panel: var(--tc-s2);
            --text: var(--tc-txt);
            --text-dim: var(--tc-txt2);
            --border: var(--tc-border);
          }
          body { margin: 0; background: var(--tc-bg, #0D0D0D); color: var(--tc-txt, #F0EDE6); }
          .layout-wrapper { display: flex; min-height: 100dvh; background: var(--tc-bg, #0D0D0D); color: var(--tc-txt, #F0EDE6); }
          .layout-center { width: 100%; }
          .lateral { display: none; }
          @media (min-width: 900px) {
            .lateral {
              display: block;
              flex: 1;
              background: repeating-linear-gradient(
                90deg,
                transparent,
                transparent 39px,
                rgba(212,160,23,0.04) 39px,
                rgba(212,160,23,0.04) 40px
              );
              pointer-events: none;
            }
            .layout-center {
              width: 860px;
              flex-shrink: 0;
            }
          }
        ` }} />
      </head>
      <body>
        <AuthProvider>
          <div className="layout-wrapper">
            <div className="lateral" />
            <main className="layout-center">
              {children}
            </main>
            <div className="lateral" />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
