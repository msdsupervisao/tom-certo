import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/app/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Tom Certo — Cifras no seu tom',
  description: 'Cante um trecho, receba a cifra no seu tom — sem ficar adivinhando capotraste.',
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
  maximumScale: 1,
  userScalable: false,
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
        <style>{`
          body { margin: 0; background: #0D0D0D; }
          .layout-wrapper { display: flex; min-height: 100dvh; }
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
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <div className="layout-wrapper">
            <div className="lateral" />
            <div className="layout-center">
              {children}
            </div>
            <div className="lateral" />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
