'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buscarMusicaPorId } from '@/lib/data/songs-mock';
import { salvarENotificar } from '@/lib/storage-events';
import { useAuth } from '@/app/components/AuthProvider';
import { obterFavoritosNuvem, removerFavoritoNuvem } from '@/lib/favoritos-nuvem';

interface ItemFav {
  id: string;
  titulo?: string;
  artista?: string;
  capa?: string;
}

interface PainelFavoritosProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function PainelFavoritos({ aberto, onFechar }: PainelFavoritosProps) {
  const [favoritos, setFavoritos] = useState<ItemFav[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!aberto) return;

    if (user) {
      // Logado: busca da nuvem
      obterFavoritosNuvem().then(itens => {
        setFavoritos(itens);
        itens.forEach((item, idx) => {
          if (!item.titulo) return;
          fetch(`/api/spotify?q=${encodeURIComponent((item.titulo || '') + ' ' + (item.artista || ''))}`)
            .then(r => r.json())
            .then(d => {
              if (d.imagem) {
                setFavoritos(prev => prev.map((f, i) => i === idx ? { ...f, capa: d.imagem } : f));
              }
            }).catch(() => {});
        });
      });
    } else {
      // Não logado: busca do localStorage
      try {
        const raw = localStorage.getItem('tom-certo:favoritos');
        if (!raw) { setFavoritos([]); return; }
        const parsed = JSON.parse(raw);
        const itens: ItemFav[] = parsed.map((x: any) => {
          if (typeof x === 'string') {
            const mock = buscarMusicaPorId(x);
            return { id: x, titulo: mock?.titulo, artista: mock?.artista };
          }
          const mock = buscarMusicaPorId(x.id);
          return {
            id: x.id,
            titulo: x.titulo || mock?.titulo || x.id.split('/')[1]?.replace(/-/g, ' '),
            artista: x.artista || mock?.artista || x.id.split('/')[0]?.replace(/-/g, ' '),
          };
        });
        setFavoritos(itens);
        itens.forEach((item, idx) => {
          if (!item.titulo) return;
          fetch(`/api/spotify?q=${encodeURIComponent((item.titulo || '') + ' ' + (item.artista || ''))}`)
            .then(r => r.json())
            .then(d => {
              if (d.imagem) {
                setFavoritos(prev => prev.map((f, i) => i === idx ? { ...f, capa: d.imagem } : f));
              }
            }).catch(() => {});
        });
      } catch { setFavoritos([]); }
    }
  }, [aberto, user]);

  async function remover(id: string) {
    if (user) {
      const sucesso = await removerFavoritoNuvem(id);
      if (sucesso) setFavoritos(prev => prev.filter(f => f.id !== id));
    } else {
      try {
        const raw = localStorage.getItem('tom-certo:favoritos');
        const parsed = raw ? JSON.parse(raw) : [];
        const nova = parsed.filter((x: any) => (typeof x === 'string' ? x : x.id) !== id);
        salvarENotificar('tom-certo:favoritos', JSON.stringify(nova));
        setFavoritos(prev => prev.filter(f => f.id !== id));
      } catch {}
    }
  }

  return (
    <>
      {aberto && (
        <div onClick={onFechar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        background: 'var(--panel)', borderLeft: '1px solid var(--border)',
        zIndex: 101, transform: aberto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease', display: 'flex', flexDirection: 'column',
        boxShadow: aberto ? '-8px 0 32px rgba(0,0,0,0.3)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>❤️</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Minhas favoritas</span>
            {favoritos.length > 0 && (
              <span style={{ background: 'var(--violeta)', color: '#fff', borderRadius: 50, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                {favoritos.length}
              </span>
            )}
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-dim)', padding: 4 }}>✕</button>
        </div>

        {!user && (
          <div style={{ padding: '12px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
            Entre para sincronizar seus favoritos em qualquer dispositivo!
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {favoritos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🎵</p>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Nenhuma favorita ainda</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Clique no coração em qualquer música para salvar aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {favoritos.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-soft)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: item.capa ? `url(${item.capa}) center/cover` : 'linear-gradient(135deg, var(--violeta), var(--rosa))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {!item.capa && '🎵'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, margin: 0, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titulo || 'Música'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.artista || 'Artista'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Link href={`/musica/${item.id}`} onClick={onFechar} style={{ background: 'var(--violeta)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                      Ver
                    </Link>
                    <button onClick={() => remover(item.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 14, cursor: 'pointer', color: 'var(--text-dim)' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
