// Testa o detector de produção com melodias conhecidas, sem duplicar o algoritmo.
import { detectarTomDaMelodia } from './lib/pitch-detection.ts';

function detectarTom(notas) {
  const resultado = detectarTomDaMelodia(notas.map(nota => ({ nota, confianca: 1 })));
  return { ...resultado, conf: resultado?.confianca };
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
