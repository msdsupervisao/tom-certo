// lib/data/songs-mock.ts
//
// O catálogo de TESTE (5 músicas com cifra inventada) foi removido: o app
// agora exibe SEMPRE a cifra real do Cifra Club. Para não quebrar links/
// favoritos/recentes antigos que apontavam para os ids numéricos `1`–`5`,
// mantemos abaixo um mapa que redireciona esses ids para o slug real
// correspondente no Cifra Club (ex.: `1` -> `ana-vilela/trem-bala`).
//
// As funções `buscarMusicas` / `buscarMusicaPorId` continuam exportadas
// (agora sem resultados) só para não exigir mudança nos imports existentes.

import { Song } from '../types';

/** Catálogo vazio — nada de cifra falsa. */
export const SONGS_MOCK: Song[] = [];

/**
 * Ids legados (do antigo catálogo de teste) -> slug real no Cifra Club.
 * Quem abrir `/musica/1` é redirecionado para a cifra verdadeira.
 */
export const REDIRECIONAMENTOS_LEGADOS: Record<string, string> = {
  '1': 'ana-vilela/trem-bala',
  '2': 'chitaozinho-e-xororo/evidencias',
  '3': 'tom-jobim/aguas-de-marco',
  '4': 'legiao-urbana/tempo-perdido',
  '5': 'tom-jobim/garota-de-ipanema',
};

/** Retorna o slug real do Cifra Club para um id legado, ou undefined. */
export function slugRealDoLegado(id: string): string | undefined {
  return REDIRECIONAMENTOS_LEGADOS[id];
}

export function buscarMusicas(_query: string): Song[] {
  return [];
}

export function buscarMusicaPorId(_id: string): Song | undefined {
  return undefined;
}
