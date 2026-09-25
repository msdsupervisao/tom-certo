// Os dois domínios pertencem ao Cifra Club e usam os mesmos slugs de música.
// A disponibilidade pode diferir entre eles para consultas feitas pelo servidor.
const ORIGENS = [
  'https://www.cifraclub.com.br',
  'https://www.cifraclub.com',
  'https://r.jina.ai/http://www.cifraclub.com.br',
];

export async function buscarCifraNaFonte(
  slug: string,
  simplificada: boolean,
  signal: AbortSignal,
  consultar: typeof fetch = fetch,
): Promise<Response> {
  const caminho = `/${slug}/${simplificada ? 'simplificada.html' : ''}`;

  for (const [indice, origem] of ORIGENS.entries()) {
    const jina = origem.startsWith('https://r.jina.ai/');
    let resposta: Response;
    try {
      resposta = await consultar(`${origem}${caminho}`, {
        headers: jina
          ? { Accept: 'text/plain', 'X-Return-Format': 'markdown' }
          : {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
              Accept: 'text/html',
            },
        signal,
        cache: 'no-store',
      });
    } catch (error) {
      console.warn('[cifra] Falha ao consultar fonte', { origem, erro: String(error) });
      if (indice === ORIGENS.length - 1) throw error;
      continue;
    }

    const indisponivel = resposta.status === 403 || resposta.status >= 500;
    if (!indisponivel || indice === ORIGENS.length - 1) return resposta;

    // Tenta a próxima origem sem manipular o corpo da resposta bloqueada:
    // alguns runtimes serverless encerram a conexão ao cancelar esse stream.
  }

  throw new Error('Nenhuma fonte de cifra disponível');
}
