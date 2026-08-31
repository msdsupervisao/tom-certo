// Valida a lógica de Krumhansl-Schmuckler (mesma portada para o TS).
const NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PERFIL_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  const d = Math.sqrt(da * db);
  return d === 0 ? 0 : num / d;
}

function detectarTom(notas) {
  const hist = new Array(12).fill(0);
  for (const nome of notas) { const i = NOMES.indexOf(nome); if (i >= 0) hist[i] += 1; }
  const notaFinal = NOMES.indexOf(notas.at(-1));
  const candidatos = [];
  for (let t = 0; t < 12; t++) {
    for (const [modo, perfil] of [['maior', PERFIL_MAIOR], ['menor', PERFIL_MENOR]]) {
      const rot = perfil.map((_, p) => perfil[(p - t + 12) % 12]);
      const corr = pearson(hist, rot);
      candidatos.push({ corr, pontuacao: corr + (t === notaFinal ? 0.1 : 0), tonica: t, modo });
    }
  }
  candidatos.sort((a, b) => b.pontuacao - a.pontuacao);
  const [best, second] = candidatos;
  const margem = Math.max(0, best.pontuacao - second.pontuacao);
  const conf = Math.round(Math.max(0, Math.min(1, best.corr * 0.8 + Math.min(1, margem / 0.12) * 0.2)) * 100);
  return { nota: NOMES[best.tonica], modo: best.modo, conf };
}

// melodias reais (sequência de classes de tom; nota sustentada = repetida)
const casos = [
  { nome: 'Twinkle Twinkle (C maior)', esperado: 'C',
    notas: 'C C G G A A G F F E E D D C G G F F E E D G G F F E E D C C G G A A G F F E E D D C'.split(' ') },
  { nome: 'Parabéns / Happy Birthday (G maior)', esperado: 'G',
    notas: 'D D E D G F# D D E D A G D D D B G F# E C C B G A G'.split(' ') },
  { nome: 'Für Elise (Lá menor)', esperado: 'A',
    notas: 'E D# E D# E B D C A C E A B E G# B C E E D# E D# E B D C A C E A B E C B A'.split(' ') },
  { nome: 'Asa Branca (Sol maior, trecho)', esperado: 'G',
    notas: 'G B D G B D C B A G B D B A G F# G D B G A B C B A G G'.split(' ') },
];

let ok = 0;
for (const c of casos) {
  const r = detectarTom(c.notas);
  const acerto = r.nota === c.esperado;
  if (acerto) ok++;
  console.log(`${acerto ? 'OK ' : 'XX '} ${c.nome.padEnd(38)} esperado ${c.esperado.padEnd(2)} -> ${r.nota} ${r.modo} (corr ${r.conf}%)`);
}
console.log(`\n${ok}/${casos.length} tônicas corretas`);
if (ok !== casos.length) process.exitCode = 1;
