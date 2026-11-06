// Carregado com "node --import ./test/registrar.mjs --test": permite importar src/lib sem instalar o Firebase
// e sem a extensão .js nos imports (como o Next.js faz).
import { register } from 'node:module';
register('./resolver.mjs', import.meta.url);
