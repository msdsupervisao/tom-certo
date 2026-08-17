'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adicionarFavoritoNuvem } from '@/lib/favoritos-nuvem';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  carregando: boolean;
  entrarComEmail: (email: string) => Promise<{ error: string | null }>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  carregando: true,
  entrarComEmail: async () => ({ error: null }),
  sair: async () => {},
});

/** Migra favoritos salvos no localStorage para a nuvem (Supabase) após login. */
async function migrarFavoritosParaNuvem() {
  try {
    const raw = localStorage.getItem('tom-certo:favoritos');
    if (!raw) return;
    
    const itens = JSON.parse(raw);
    if (!Array.isArray(itens) || itens.length === 0) return;

    let migradosComSucesso = 0;
    for (const item of itens) {
      try {
        const id      = typeof item === 'string' ? item : item.id;
        const titulo  = typeof item === 'string' ? undefined : item.titulo;
        const artista = typeof item === 'string' ? undefined : item.artista;
        await adicionarFavoritoNuvem(id, titulo, artista);
        migradosComSucesso++;
      } catch (itemError) {
        // Continua com o próximo item mesmo se este falhar
        console.warn('[auth] Erro ao migrar item individual:', itemError);
      }
    }

    // Limpa localStorage após migração
    if (migradosComSucesso > 0) {
      localStorage.removeItem('tom-certo:favoritos');
      console.log(`[auth] ${migradosComSucesso} favoritos migrados para nuvem`);
    }
  } catch (e) {
    console.error('[auth] Erro ao migrar favoritos:', e);
    // Não remove do localStorage se houve erro
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setCarregando(false);
      if (event === 'SIGNED_IN') {
        window.history.replaceState({}, '', window.location.pathname);
        // Migra favoritos locais para a nuvem em background
        migrarFavoritosParaNuvem();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function entrarComEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, carregando, entrarComEmail, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
