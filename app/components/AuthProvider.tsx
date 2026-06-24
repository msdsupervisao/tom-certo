'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function entrarComEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://tom-certo-y5wn.vercel.app' },
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
