import { supabase } from './supabase';

export interface ItemFavorito {
  id: string;
  titulo?: string;
  artista?: string;
}

function logError(action: string, error: unknown) {
  console.error(`[favoritos-nuvem] ${action}:`, error);
}

export async function obterFavoritosNuvem(): Promise<ItemFavorito[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favoritos')
    .select('musica_id, titulo, artista')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: false });

  if (error) {
    logError('obterFavoritosNuvem', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.musica_id,
    titulo: row.titulo,
    artista: row.artista,
  }));
}

export async function adicionarFavoritoNuvem(
  id: string,
  titulo?: string,
  artista?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('favoritos').upsert({
    user_id: user.id,
    musica_id: id,
    titulo,
    artista,
  });

  if (error) {
    logError('adicionarFavoritoNuvem', error);
    return false;
  }
  return true;
}

export async function removerFavoritoNuvem(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('favoritos').delete()
    .eq('musica_id', id)
    .eq('user_id', user.id);

  if (error) {
    logError('removerFavoritoNuvem', error);
    return false;
  }
  return true;
}

export async function ehFavoritoNuvem(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('favoritos')
    .select('musica_id')
    .eq('musica_id', id)
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    logError('ehFavoritoNuvem', error);
  }
  return !!data;
}
