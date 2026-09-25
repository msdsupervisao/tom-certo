import assert from 'node:assert/strict';
import test from 'node:test';
import { buscarCifraNaFonte } from '../lib/cifra-source.ts';

test('usa a fonte brasileira quando disponível, sem duplicar consultas', async () => {
  const chamadas = [];
  const resposta = await buscarCifraNaFonte('artista/musica', false, new AbortController().signal, async (url) => {
    chamadas.push(url);
    return new Response('<pre>C G Am F</pre>');
  });
  assert.equal(resposta.status, 200);
  assert.deepEqual(chamadas, ['https://www.cifraclub.com.br/artista/musica/']);
});

for (const status of [403, 502, 503]) {
  test(`recupera a cifra simplificada quando a fonte brasileira retorna ${status}`, async () => {
    const chamadas = [];
    const signal = new AbortController().signal;
    const resposta = await buscarCifraNaFonte('artista/musica', true, signal, async (url, options) => {
      chamadas.push(url);
      assert.equal(options.signal, signal);
      return chamadas.length === 1 ? new Response('Indisponível', { status }) : new Response('<pre>C G Am F</pre>');
    });
    assert.equal(resposta.status, 200);
    assert.equal(await resposta.text(), '<pre>C G Am F</pre>');
    assert.deepEqual(chamadas, [
      'https://www.cifraclub.com.br/artista/musica/simplificada.html',
      'https://www.cifraclub.com/artista/musica/simplificada.html',
    ]);
  });
}

test('não repete consultas para cifras inexistentes ou limite de requisições', async () => {
  for (const status of [404, 429]) {
    let chamadas = 0;
    const resposta = await buscarCifraNaFonte('artista/musica', false, new AbortController().signal, async () => {
      chamadas++;
      return new Response(null, { status });
    });
    assert.equal(resposta.status, status);
    assert.equal(chamadas, 1);
  }
});

test('tenta a camada de leitura depois das duas fontes falharem', async () => {
  let chamadas = 0;
  const resposta = await buscarCifraNaFonte('artista/musica', false, new AbortController().signal, async () => {
    chamadas++;
    return new Response('Bloqueado', { status: 403 });
  });
  assert.equal(resposta.status, 403);
  assert.equal(chamadas, 3);
});

test('respeita o cancelamento sem iniciar uma nova consulta', async () => {
  const controller = new AbortController();
  controller.abort();
  let chamadas = 0;
  await assert.rejects(buscarCifraNaFonte('artista/musica', false, controller.signal, async (_url, options) => {
    chamadas++;
    options.signal.throwIfAborted();
  }), { name: 'AbortError' });
  assert.equal(chamadas, 1);
});
