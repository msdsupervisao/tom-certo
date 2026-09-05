// Node executa o TypeScript nativamente. Resolve os imports relativos sem extensão
// usados pelo Next para testar exatamente os módulos de produção, sem cópias.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const candidato = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidato))) return nextResolve(candidato.href, context);
    }
    return nextResolve(specifier, context);
  },
});
