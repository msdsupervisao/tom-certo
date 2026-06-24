import { supabase } from './supabase';

export interface ItemFavorito {
  id: string;
  titulo?: string;
  artista?: string;
}

export async function obterFavoritosNuvem(): Promise<ItemFavorito[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favoritos')
    .select('musica_id, titulo, artista')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.musica_id,
    titulo: row.titulo,
    artista: row.artista,
  }));
}

export async function adicionarFavoritoNuvem(
  id: string,
  titulo?: string,
  artista?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('favoritos').upsert({
    user_id: user.id,
    musica_id: id,
    titulo,
    artista,
  });
}

export async function removerFavoritoNuvem(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('favoritos').delete()
    .eq('musica_id', id)
    .eq('user_id', user.id);
}

export async function ehFavoritoNuvem(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('favoritos')
    .select('musica_id')
    .eq('musica_id', id)
    .eq('user_id', user.id)
    .single();
  return !!data;
}
