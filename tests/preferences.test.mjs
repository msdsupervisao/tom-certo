import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { obterPreferenciasMusica, salvarPreferenciasMusica, intervaloParaPreferencias, PREFERENCIAS_PADRAO } from '../lib/preferencias-musica.ts';

let dados;
beforeEach(() => {
  dados = new Map();
  globalThis.window = { localStorage: {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  } };
});

test('cada música retoma seu próprio tom e preferências de leitura', () => {
  const p = { ...PREFERENCIAS_PADRAO, tom: 'F', semitons: 1, tamanhoFonte: 18, velocidade: 0.4, duasColunas: true };
  assert.equal(salvarPreferenciasMusica('artista/primeira', p), true);
  assert.equal(salvarPreferenciasMusica('artista/segunda', { ...PREFERENCIAS_PADRAO, tom: 'D' }), true);
  assert.deepEqual(obterPreferenciasMusica('artista/primeira'), p);
  assert.equal(obterPreferenciasMusica('artista/segunda').tom, 'D');
  assert.equal(obterPreferenciasMusica('artista/terceira'), null);
});

test('trocar de versão mantém a tonalidade escolhida e respeita bemóis', () => {
  const p = { ...PREFERENCIAS_PADRAO, tom: 'C', semitons: 2 };
  assert.equal(intervaloParaPreferencias('Bb', p), 2);
  assert.equal(intervaloParaPreferencias('A', p), 3);
  assert.equal(intervaloParaPreferencias(null, p), 2);
  assert.equal(intervaloParaPreferencias('C', { ...p, tom: 'Bb', semitons: 10 }), 10);
});

test('dados corrompidos ou fora de faixa não quebram a abertura da cifra', () => {
  for (const raw of ['invalid', 'null', '[]', '{"artista/primeira":{"preferencias":{"tom":"C"},"atualizadoEm":1}}']) {
    dados.set('tom-certo:preferencias-musica:v1', raw);
    assert.equal(obterPreferenciasMusica('artista/primeira'), null);
  }
  assert.equal(salvarPreferenciasMusica('artista/primeira', { ...PREFERENCIAS_PADRAO, semitons: 99 }), false);
});

test('falha ao salvar não é reportada como sucesso e preserva o registro anterior', () => {
  salvarPreferenciasMusica('artista/primeira', PREFERENCIAS_PADRAO);
  window.localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(salvarPreferenciasMusica('artista/primeira', { ...PREFERENCIAS_PADRAO, tom: 'G' }), false);
  assert.deepEqual(obterPreferenciasMusica('artista/primeira'), PREFERENCIAS_PADRAO);
});
