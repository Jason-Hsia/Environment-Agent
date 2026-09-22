import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['scripts/verify.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/verify.mjs'});
await import('../.sites-runtime/verify.mjs');
