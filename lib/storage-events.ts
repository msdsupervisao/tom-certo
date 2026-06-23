// lib/storage-events.ts
//
// Evento customizado que sincroniza mudanças de localStorage entre
// componentes na mesma página. O evento nativo 'storage' do browser
// só dispara em OUTRAS abas — não funciona na mesma página.
// Esse módulo resolve isso com um evento customizado simples.

export const STORAGE_EVENT = 'tomcerto:storage';

/** Salva no localStorage E notifica todos os componentes na mesma página */
export function salvarENotificar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { chave } }));
  } catch {}
}

/** Escuta mudanças de localStorage e chama o callback */
export function escutarStorage(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener('popstate', handler);
  window.addEventListener('focus', handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener('popstate', handler);
    window.removeEventListener('focus', handler);
  };
}
