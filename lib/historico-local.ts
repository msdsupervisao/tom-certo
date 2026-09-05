// lib/historico-local.ts
//
// Persistência real via localStorage. Não é um placeholder decorativo:
// cada vez que o usuário detecta um tom numa música, isso é registrado
// aqui, e os cards de "Perfil Vocal", "Músicas Recentes" e "Estatísticas"
// na home são TODOS derivados destes dados reais - nada é hardcoded.
//
// Limitação consciente: isso é por navegador/dispositivo, não por conta
// de usuário. Trocar de navegador ou limpar dados
// reseta o histórico. Isso é aceitável para o estágio atual do produto.

import type { NomeNota } from './music-theory';

const CHAVE_HISTORICO = 'tom-certo:historico';
const CHAVE_FAVORITOS = 'tom-certo:favoritos';
const CHAVE_VISITADAS = 'tom-certo:visitadas';

export interface EntradaHistorico {
  songId: string;
  tomDetectado: NomeNota;
  estabilidade: number;
  timestamp: number;
}

function lerHistorico(): EntradaHistorico[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_HISTORICO);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

function salvarHistorico(historico: EntradaHistorico[]) {
  try {
    window.localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  } catch {
    // Armazenamento indisponível (modo privado, quota excedida) - falha
    // silenciosa é aceitável aqui, já que isso é um recurso complementar,
    // não o motor principal do app.
  }
}

/** Registra uma nova detecção de tom. Mantém só as últimas 200 entradas. */
export function registrarDeteccao(
  songId: string,
  tomDetectado: NomeNota,
  estabilidade: number
) {
  const historico = lerHistorico();
  historico.push({ songId, tomDetectado, estabilidade, timestamp: Date.now() });
  salvarHistorico(historico.slice(-200));
}

export function obterHistorico(): EntradaHistorico[] {
  return lerHistorico();
}

/** Tom mais frequentemente detectado em todo o histórico (moda). */
export function obterTomMaisFrequente(): NomeNota | null {
  const historico = lerHistorico();
  if (historico.length === 0) return null;

  const contagem: Record<string, number> = {};
  historico.forEach((e) => {
    contagem[e.tomDetectado] = (contagem[e.tomDetectado] || 0) + 1;
  });

  const [tom] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  return tom as NomeNota;
}

/** Indicador médio do algoritmo, não uma taxa medida de acertos. */
export function obterConfiancaMedia(): number | null {
  const historico = lerHistorico();
  if (historico.length === 0) return null;
  const soma = historico.reduce((acc, e) => acc + e.estabilidade, 0);
  return Math.round(soma / historico.length);
}

export function obterTotalAnalises(): number {
  return lerHistorico().length;
}

export function obterUltimaAnalise(): number | null {
  const historico = lerHistorico();
  if (historico.length === 0) return null;
  return Math.max(...historico.map((e) => e.timestamp));
}

/** Músicas distintas analisadas, da mais recente para a mais antiga. */
export function obterMusicasRecentes(limite = 5): string[] {
  const historico = lerHistorico();
  const vistas = new Set<string>();
  const ordenado = [...historico].sort((a, b) => b.timestamp - a.timestamp);

  const resultado: string[] = [];
  for (const entrada of ordenado) {
    if (!vistas.has(entrada.songId)) {
      vistas.add(entrada.songId);
      resultado.push(entrada.songId);
    }
    if (resultado.length >= limite) break;
  }
  return resultado;
}

// --- Favoritos ---

export interface ItemFavorito {
  id: string;
  titulo?: string;
  artista?: string;
}

function lerFavoritos(): ItemFavorito[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_FAVORITOS);
    if (!bruto) return [];
    const parsed = JSON.parse(bruto);
    // Compatibilidade com formato antigo (array de strings)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((id: string) => ({ id }));
    }
    return parsed;
  } catch {
    return [];
  }
}

export function obterFavoritos(): ItemFavorito[] {
  return lerFavoritos();
}

export function alternarFavorito(id: string, titulo?: string, artista?: string): ItemFavorito[] {
  const favoritos = lerFavoritos();
  const existe = favoritos.some(f => f.id === id);
  const novaLista = existe
    ? favoritos.filter(f => f.id !== id)
    : [...favoritos, { id, titulo, artista }];
  try {
    window.localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(novaLista));
  } catch {}
  return novaLista;
}

export function ehFavorito(id: string): boolean {
  return lerFavoritos().some(f => f.id === id);
}

// --- Histórico de músicas visitadas (com título e artista) ---

export interface MusicaVisitada {
  id: string;        // slug ou id mock
  titulo: string;
  artista: string;
  timestamp: number;
}

function lerVisitadas(): MusicaVisitada[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_VISITADAS);
    return bruto ? JSON.parse(bruto) : [];
  } catch { return []; }
}

/** Registra uma visita à página de uma música. */
export function registrarVisita(id: string, titulo: string, artista: string) {
  try {
    const visitadas = lerVisitadas();
    // Remove entrada anterior da mesma música se existir
    const filtradas = visitadas.filter(v => v.id !== id);
    // Adiciona no início (mais recente primeiro)
    filtradas.unshift({ id, titulo, artista, timestamp: Date.now() });
    window.localStorage.setItem(CHAVE_VISITADAS, JSON.stringify(filtradas.slice(0, 50)));
  } catch {}
}

/** Retorna músicas visitadas, da mais recente para a mais antiga. */
export function obterMusicasVisitadas(limite = 12): MusicaVisitada[] {
  return lerVisitadas().slice(0, limite);
}
