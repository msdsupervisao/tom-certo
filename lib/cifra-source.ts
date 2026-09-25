// Os dois domínios pertencem ao Cifra Club e usam os mesmos slugs de música.
// A disponibilidade pode diferir entre eles para consultas feitas pelo servidor.
const ORIGENS = ['https://www.cifraclub.com.br', 'https://www.cifraclub.com'];

export async function buscarCifraNaFonte(
  slug: string,
  simplificada: boolean,
  signal: AbortSignal,
  consultar: typeof fetch = fetch,
): Promise<Response> {
  const caminho = `/${slug}/${simplificada ? 'simplificada.html' : ''}`;

  for (const [indice, origem] of ORIGENS.entries()) {
    const resposta = await consultar(`${origem}${caminho}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Accept: 'text/html',
      },
      signal,
      cache: 'no-store',
    });

    const indisponivel = resposta.status === 403 || resposta.status >= 500;
    if (!indisponivel || indice === ORIGENS.length - 1) return resposta;

    // Libera a conexão antes de tentar o domínio alternativo, com o mesmo prazo.
    await resposta.body?.cancel();
  }

  throw new Error('Nenhuma fonte de cifra disponível');
}
