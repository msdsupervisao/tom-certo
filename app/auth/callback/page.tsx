'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/');
      } else {
        supabase.auth.exchangeCodeForSession(window.location.search).then(() => {
          router.replace('/');
        }).catch(() => {
          router.replace('/?error=auth');
        });
      }
    });
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Entrando...</p>
    </div>
  );
}
