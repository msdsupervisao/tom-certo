import { NextResponse } from 'next/server';

export async function GET() {
  const resultados: Record<string, unknown> = {};
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': 'https://www.cifraclub.com.br/',
  };

  // Teste 1: endpoint JSON
  try {
    const r = await fetch('https://www.cifraclub.com.br/api/search/?q=evidencias&limit=3', {
      headers: { ...HEADERS, Accept: 'application/json' },
    });
    resultados.json_status = r.status;
    if (r.ok) resultados.json_data = await r.json();
    else resultados.json_body = (await r.text()).slice(0, 200);
  } catch (e) { resultados.json_erro = String(e); }

  // Teste 2: HTML da busca + extração do __NEXT_DATA__
  try {
    const r = await fetch('https://www.cifraclub.com.br/pesquisar/?q=evidencias', {
      headers: { ...HEADERS, Accept: 'text/html' },
    });
    resultados.html_status = r.status;
    if (r.ok) {
      const html = await r.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          resultados.next_data_keys = Object.keys(json?.props?.pageProps || {});
          resultados.next_data_trecho = JSON.stringify(json?.props?.pageProps).slice(0, 500);
        } catch { resultados.next_data_erro = 'parse falhou'; }
      } else {
        resultados.next_data = 'nao encontrado no HTML';
        resultados.html_trecho = html.slice(0, 300);
      }
    }
  } catch (e) { resultados.html_erro = String(e); }

  // Teste 3: cifra direta
  try {
    const r = await fetch('https://www.cifraclub.com.br/chitaozinho-e-xororo/evidencias/', {
      headers: HEADERS,
    });
    resultados.cifra_status = r.status;
    if (r.ok) {
      const html = await r.text();
      resultados.cifra_tem_pre = html.includes('<pre');
    }
  } catch (e) { resultados.cifra_erro = String(e); }

  return NextResponse.json(resultados, { headers: { 'Content-Type': 'application/json' } });
}
