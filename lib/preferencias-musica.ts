import { calcularIntervaloSemitons, ehTomValido, transporTom } from './music-theory';

const CHAVE = 'tom-certo:preferencias-musica:v1';
const LIMITE_MUSICAS = 200;

export interface PreferenciasMusica {
  tom: string | null;
  semitons: number;
  tamanhoFonte: number;
  simplificada: boolean;
  velocidade: number;
  duasColunas: boolean;
}

export const PREFERENCIAS_PADRAO: PreferenciasMusica = {
  tom: null, semitons: 0, tamanhoFonte: 15,
  simplificada: false, velocidade: 0.2, duasColunas: false,
};

interface Registro {
  preferencias: PreferenciasMusica;
  atualizadoEm: number;
}

function validar(valor: unknown): valor is PreferenciasMusica {
  if (!valor || typeof valor !== 'object') return false;
  const p = valor as PreferenciasMusica;
  return (p.tom === null || (typeof p.tom === 'string' && ehTomValido(p.tom)))
    && Number.isInteger(p.semitons) && Math.abs(p.semitons) <= 12
    && Number.isInteger(p.tamanhoFonte) && p.tamanhoFonte >= 12 && p.tamanhoFonte <= 24
    && typeof p.simplificada === 'boolean' && typeof p.duasColunas === 'boolean'
    && Number.isFinite(p.velocidade) && p.velocidade >= 0.1 && p.velocidade <= 1.5;
}

function lerRegistros(): Record<string, Registro> {
  if (typeof window === 'undefined') return {};
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) || '{}');
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
    return Object.fromEntries(Object.entries(bruto).filter(([, registro]) =>
      registro && validar(registro.preferencias) && Number.isFinite(registro.atualizadoEm)
    ));
  } catch {
    return {};
  }
}

export function obterPreferenciasMusica(slug: string): PreferenciasMusica | null {
  return lerRegistros()[slug]?.preferencias ?? null;
}

/** Guarda apenas ajustes, nunca letra, cifra ou áudio. Retorna falha de armazenamento. */
export function salvarPreferenciasMusica(slug: string, preferencias: PreferenciasMusica): boolean {
  if (typeof window === 'undefined' || !slug || !validar(preferencias)) return false;
  try {
    const registros = lerRegistros();
    const entradas = Object.entries(registros).filter(([id]) => id !== slug)
      .sort(([, a], [, b]) => b.atualizadoEm - a.atualizadoEm)
      .slice(0, LIMITE_MUSICAS - 1);
    window.localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries([
      [slug, { preferencias, atualizadoEm: Date.now() }], ...entradas,
    ])));
    return true;
  } catch {
    return false;
  }
}

/** Mantém o tom escolhido mesmo se a versão simplificada tiver outro tom original. */
export function intervaloParaPreferencias(tomOriginal: string | null, preferencias: PreferenciasMusica): number {
  if (tomOriginal && preferencias.tom) {
    if (calcularIntervaloSemitons(transporTom(tomOriginal, preferencias.semitons), preferencias.tom) === 0) {
      return preferencias.semitons;
    }
    return calcularIntervaloSemitons(tomOriginal, preferencias.tom) ?? preferencias.semitons;
  }
  return preferencias.semitons;
}
