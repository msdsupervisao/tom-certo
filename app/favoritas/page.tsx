'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import { salvarENotificar, escutarStorage } from '@/lib/storage-events';
import { obterFavoritosNuvem, removerFavoritoNuvem } from '@/lib/favoritos-nuvem';
import { useAuth } from '@/app/components/AuthProvider';
import { Heart, Music, ChevronRight, Trash2 } from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';

interface FavItem {
  id: string;
  titulo: string;
  artista: string;
  slug: string;
  isMock: boolean;
}

export default function FavoritasPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState<FavItem[]>([]);

  function recarregarFavoritos() {
    try {
      const raw = localStorage.getItem('tom-certo:favoritos');
      if (!raw) { setFavoritos([]); return; }
      const parsed = JSON.parse(raw);
      const itens = parsed.map((x: any) => {
        const id = typeof x === 'string' ? x : x.id;
        const mockSong = buscarMusicaPorId(id);
        if (mockSong) return { id, titulo: mockSong.titulo, artista: mockSong.artista, slug: id, isMock: true };
        return { id, titulo: x.titulo || id.split('/')[1]?.replace(/-/g, ' ') || 'Música', artista: x.artista || id.split('/')[0]?.replace(/-/g, ' ') || 'Artista', slug: id, isMock: false };
      });
      setFavoritos(itens);
    } catch { setFavoritos([]); }
  }

  useEffect(() => {
    recarregarFavoritos();
    return escutarStorage(recarregarFavoritos);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    obterFavoritosNuvem().then((lista: any[]) => {
      const itens = lista.map((f: any) => {
        const mockSong = buscarMusicaPorId(f.id);
        if (mockSong) return { id: f.id, titulo: mockSong.titulo, artista: mockSong.artista, slug: f.id, isMock: true };
        return { id: f.id, titulo: f.titulo || f.id, artista: f.artista || '', slug: f.id, isMock: false };
      });
      setFavoritos(itens);
    });
  }, [user]);

  async function removerFavorito(id: string) {
    if (user) {
      const sucesso = await removerFavoritoNuvem(id);
      if (sucesso) setFavoritos(prev => prev.filter(f => f.id !== id));
    } else {
      try {
        const raw = localStorage.getItem('tom-certo:favoritos');
        const atual = raw ? JSON.parse(raw) : [];
        const nova = atual.filter((x: any) => (typeof x === 'string' ? x : x.id) !== id);
        salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
        setFavoritos(prev => prev.filter(f => f.id !== id));
      } catch {}
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--tc-bg)', color: 'var(--tc-txt)' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--tc-gold)', letterSpacing: -0.5 }}>
              Tom<span style={{ color: 'var(--tc-txt3)', fontWeight: 500 }}>Certo</span>
            </span>
            <p style={{ fontSize: 11, color: 'var(--tc-txt3)', marginTop: 2 }}>{favoritos.length} músicas salvas</p>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-gold)', fontSize: 12, fontWeight: 600 }}>
            <Heart size={16} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 16px 10px' }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
        <span style={{ fontSize: 10, color: 'var(--tc-txt3)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 8px' }}>Suas favoritas</span>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: '0.5px', background: 'var(--tc-border)' }} />)}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 80px' }}>
        {favoritos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--tc-s1)', borderRadius: 20, border: '0.5px solid var(--tc-border)' }}>
            <Heart size={48} style={{ color: 'var(--tc-txt3)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nenhuma favorita ainda</p>
            <p style={{ color: 'var(--tc-txt2)', fontSize: 13, lineHeight: 1.6 }}>Busque uma música e toque o coração para salvar aqui.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {favoritos.map(f => {
              const href = `/musica/${f.slug}`;
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--tc-s1)', border: '0.5px solid var(--tc-border)', borderRadius: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(212,160,23,0.12)', border: '0.5px solid rgba(212,160,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tc-gold)', flexShrink: 0 }}>
                    <Music size={18} />
                  </div>
                  <Link href={href} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tc-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.titulo}</p>
                    <p style={{ fontSize: 11, color: 'var(--tc-txt2)' }}>{f.artista}</p>
                  </Link>
                  <button
                    onClick={() => removerFavorito(f.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-txt3)', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--tc-danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--tc-txt3)')}
                    aria-label="Remover favorito"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Link href={href} style={{ color: 'var(--tc-txt3)', display: 'flex' }}>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
