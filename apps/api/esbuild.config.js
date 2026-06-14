import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  external: ['sharp'],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'module'",
      "import { fileURLToPath as __fileURLToPath } from 'url'",
      "import { dirname as __pathDirname } from 'path'",
      'const require = __createRequire(import.meta.url)',
      'const __filename = __fileURLToPath(import.meta.url)',
      'const __dirname = __pathDirname(__filename)',
    ].join('\n'),
  },
}).catch(() => process.exit(1))
