import { redirect } from 'next/navigation';

/**
 * Mantém uma única experiência de busca no aplicativo.
 * Links antigos para /buscar passam a abrir a busca principal, que preserva
 * o artista e os resultados ao entrar em uma cifra e voltar.
 */
export default function BuscarPage() {
  redirect('/#buscar');
}
