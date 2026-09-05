import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularIntervaloSemitons, ehAcorde, frequenciaParaNota, transporAcorde, transporTom, transporCifraCompleta } from '../lib/music-theory.ts';
import { converterParaFormatoInterno, parsearCifra } from '../lib/cifra-parser.ts';
import { extrairAcordesEPosicoes, quebrarLinhaCifra } from '../lib/cifra-format.ts';

test('intervalos normalizam bemóis, sustenidos, enarmonias e tons menores', () => {
  for (const [de, para, esperado] of [
    ['Bb', 'C', 2], ['Eb', 'F', 2], ['Db', 'C#', 0], ['B', 'C', 1],
    ['C', 'B', -1], ['B♭m', 'Cm', 2], ['Cb', 'B', 0], ['E#', 'F', 0],
  ]) assert.equal(calcularIntervaloSemitons(de, para), esperado, `${de} → ${para}`);
  assert.equal(calcularIntervaloSemitons('desconhecido', 'C'), null);
  assert.equal(calcularIntervaloSemitons('C', ''), null);
  assert.equal(transporTom('Bbm', 2), 'Cm');
  assert.equal(transporTom('Bb', 0), 'Bb');
});

test('transposição preserva extensões, diminutos, aumentados e baixos', () => {
  for (const [acorde, semitons, esperado] of [
    ['E5+', 1, 'F5+'], ['Cº', 1, 'C#º'], ['C°', 1, 'C#°'], ['Cø', 2, 'Dø'],
    ['C7M', 2, 'D7M'], ['E7(9)', 1, 'F7(9)'], ['Dm7(b5)/Ab', 2, 'Em7(b5)/A#'],
    ['C6/9', 2, 'D6/9'], ['C7(9/11)/E', 2, 'D7(9/11)/F#'], ['Bb/D', 2, 'C/E'],
    ['G', -12, 'G'], ['F#m', -1, 'Fm'],
  ]) {
    assert.ok(ehAcorde(acorde), acorde);
    assert.equal(transporAcorde(acorde, semitons), esperado);
  }
  assert.equal(ehAcorde('Amor'), false);
  assert.equal(ehAcorde('Depois'), false);
  assert.equal(transporAcorde('texto', 2), 'texto');
  assert.equal(frequenciaParaNota(NaN), null);
});

test('cifra transpõe introdução, linhas instrumentais e acordes especiais juntos', () => {
  const cifra = converterParaFormatoInterno([
    '[Intro] E E5+ A F#m A/B', 'E E5+ A E/G# F#m', '',
    '[Primeira Parte]', 'E     B/D#', 'Letra de exemplo', 'Cº', 'Outra frase de exemplo',
    '[Final]', 'E5+ A/B',
  ]);
  const transposta = transporCifraCompleta(cifra, 1);
  for (const acorde of ['F', 'F5+', 'A#', 'Gm', 'A#/C', 'F/A', 'C/E', 'C#º']) {
    assert.ok(transposta.includes(`{${acorde}}`), acorde);
  }
  assert.ok(!transposta.includes('{E5+}'));
  assert.ok(!transposta.includes('{Cº}'));
  assert.ok(transposta.includes('[Intro]'));
  assert.ok(transposta.includes('[Final]'));
  assert.ok(transposta.includes('Outra frase de exemplo'));
  const instrumental = extrairAcordesEPosicoes(cifra.split('\n')[1]);
  assert.deepEqual(instrumental.acordes.slice(0, 3).map(a => a.posicao), [0, 2, 6]);
});

test('importação preserva as colunas da letra e separadores instrumentais', () => {
  assert.equal(converterParaFormatoInterno(['C     G', 'Letra exemplo']), '{C}Letra {G}exemplo');
  const cifra = converterParaFormatoInterno(['[Solo]', '| C G | Am F |', '', 'A vida canta novamente', 'E|---0-2-3---|']);
  assert.ok(cifra.includes('[Solo]'));
  assert.ok(cifra.includes('{Am}'));
  assert.ok(cifra.includes('A vida canta novamente'));
  assert.ok(!cifra.includes('E|---'));
});

test('tom extraído preserva menor e bemol; ausência não vira primeiro acorde', () => {
  const html = tom => `<title>Exemplo - Artista - Cifra Club</title>${tom ? `<button data-anchor="--chord-tone">${tom}</button>` : ''}<pre>[Intro] E Am\n\nAm   E\nUma frase criada para o teste da cifra</pre>`;
  assert.equal(parsearCifra(html('Bbm'), 'artista/exemplo').tomOriginal, 'Bbm');
  assert.equal(parsearCifra(html('Am'), 'artista/exemplo').tomOriginal, 'Am');
  assert.equal(parsearCifra(html(null), 'artista/exemplo').tomOriginal, null);
  assert.equal(parsearCifra(html('Am'), 'artista/exemplo').capotraste, null);
});

test('importação separa o tom real das formas de acorde com capotraste', () => {
  const html = `<title>Exemplo - Artista - Cifra Club</title>
    <span>Tom<!-- -->: </span><button data-anchor="--chord-tone">E<!-- --> (com forma de C)</button>
    <span>Capotraste<!-- -->:</span><button data-anchor="--chord-capo">4ª casa</button>
    <pre>[Intro] C F\n\nC     F\nUma frase criada para o teste da cifra</pre>`;
  const cifra = parsearCifra(html, 'artista/exemplo');
  assert.equal(cifra.tomOriginal, 'E');
  assert.equal(cifra.capotraste, 4);
  assert.ok(cifra.cifra.includes('{C}'));
  assert.equal(parsearCifra(html.replace('4ª casa', '99ª casa'), 'artista/exemplo').capotraste, null);
});

test('leitor quebra letra e acordes juntos em telas pequenas', () => {
  const linha = '{E}Uma frase {B/D#}comprida para {C#m7}cantar em uma tela pequena';
  const original = extrairAcordesEPosicoes(linha);
  for (const largura of [12, 20, 32]) {
    const linhas = quebrarLinhaCifra(linha, largura);
    assert.equal(linhas.map(l => l.letraLimpa).join(''), original.letraLimpa);
    assert.deepEqual(linhas.flatMap(l => l.acordes.map(a => a.nome)), original.acordes.map(a => a.nome));
    for (const l of linhas) {
      assert.ok(l.letraLimpa.length <= largura);
      for (const a of l.acordes) assert.ok(a.posicao + a.nome.length <= largura);
    }
  }
});

test('leitor mantém palavras inteiras quando o acorde alcança a borda da linha', () => {
  const linhas = quebrarLinhaCifra('{C}Uma frase d{G/B}e amor', 12);
  assert.deepEqual(linhas.map(linha => linha.letraLimpa), ['Uma frase ', 'de amor']);
  assert.deepEqual(linhas[1].acordes, [{ nome: 'G/B', posicao: 1 }]);
});
