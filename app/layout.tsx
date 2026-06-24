import type { Metadata } from 'next';
import './globals.css';
import NavbarComFavoritos from '@/app/components/NavbarComFavoritos';
import { AuthProvider } from '@/app/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Tom Certo — Cifras no seu tom',
  description: 'Cante um trecho, receba a cifra no seu tom — sem ficar adivinhando capotraste.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('tom-certo:tema');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <AuthProvider>
          <NavbarComFavoritos />
          <div className="mx-auto max-w-md px-5 py-8 md:max-w-3xl md:px-8">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}