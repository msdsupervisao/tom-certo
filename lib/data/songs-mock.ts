// lib/data/songs-mock.ts
//
// Catálogo de TESTE. Conforme decidido: sem integração de fonte externa
// e sem cadastro manual ainda - o objetivo agora é provar o motor
// (busca -> cantar -> detectar -> transpor -> exibir) de ponta a ponta.
// Trocar isso por um catálogo real (curado ou via API) não deve exigir
// mudança nenhuma no motor de transposição - só na fonte de dados.

import { Song } from '../types';

export const SONGS_MOCK: Song[] = [
  {
    id: '1',
    titulo: 'Trem-Bala',
    artista: 'Ana Vilela',
    tomOriginal: 'G',
    cifra: `{G}Quem nunca {Em}parou pra pensar na vida
{C}E na correria do dia a dia se {D}perguntou
{G}Vai ter um {Em}fim. Será que vamos
{C}Pra algum lugar melhor depois daqui {D}não sei`,
  },
  {
    id: '2',
    titulo: 'Evidências',
    artista: 'Chitãozinho & Xororó',
    tomOriginal: 'D',
    cifra: `{D}Quando eu {A}digo que deixei de te {D}amar
É porque eu {G}te amo {A}
{D}Quando eu {A}digo que não quero mais {D}you
É porque eu {Bm}penso em {E}você {A}`,
  },
  {
    id: '3',
    titulo: 'Águas de Março',
    artista: 'Tom Jobim',
    tomOriginal: 'Am',
    cifra: `{Am}É pau, é pedra, é o {D}fim do caminho
É um {G}resto de toco, é um {C}pouco sozinho
É um {F}caco de vidro, é a {Bm}vida, é o {E}sol`,
  },
  {
    id: '4',
    titulo: 'Tempo Perdido',
    artista: 'Legião Urbana',
    tomOriginal: 'E',
    cifra: `{E}Todos os dias quando acordo
{B}Não tenho mais o tempo que passou
{C#m}Mas tenho muito tempo
{A}Temos todo o tempo do {E}mundo`,
  },
  {
    id: '5',
    titulo: 'Garota de Ipanema',
    artista: 'Tom Jobim',
    tomOriginal: 'F',
    cifra: `{F}Olha que {Gm}coisa mais {Gm7/C}linda
{F}Mais cheia de {Gm}graça
{Gm7/C}É ela {F}menina
{Gm}Que vem e que {Gm7/C}passa`,
  },
];

export function buscarMusicas(query: string): Song[] {
  const termoNormalizado = query.trim().toLowerCase();
  if (!termoNormalizado) return [];

  return SONGS_MOCK.filter(
    (song) =>
      song.titulo.toLowerCase().includes(termoNormalizado) ||
      song.artista.toLowerCase().includes(termoNormalizado)
  );
}

export function buscarMusicaPorId(id: string): Song | undefined {
  return SONGS_MOCK.find((song) => song.id === id);
}
