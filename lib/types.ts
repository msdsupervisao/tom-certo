// lib/types.ts

export interface Song {
  id: string;
  titulo: string;
  artista: string;
  tomOriginal: string; // ex: "G", "Am", "C#"
  cifra: string; // texto com acordes marcados como {Acorde}
}
