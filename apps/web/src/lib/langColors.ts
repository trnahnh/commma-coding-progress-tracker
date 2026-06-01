export interface LangStyle {
  label: string
  color: string
}

const LANG_STYLES: Record<string, LangStyle> = {
  typescript: { label: 'TypeScript', color: '#3178c6' },
  typescriptreact: { label: 'TSX', color: '#3178c6' },
  tsx: { label: 'TSX', color: '#3178c6' },
  javascript: { label: 'JavaScript', color: '#f1e05a' },
  javascriptreact: { label: 'JSX', color: '#f1e05a' },
  jsx: { label: 'JSX', color: '#f1e05a' },
  python: { label: 'Python', color: '#3572a5' },
  java: { label: 'Java', color: '#b07219' },
  c: { label: 'C', color: '#555555' },
  cpp: { label: 'C++', color: '#f34b7d' },
  'c++': { label: 'C++', color: '#f34b7d' },
  csharp: { label: 'C#', color: '#178600' },
  'c#': { label: 'C#', color: '#178600' },
  fsharp: { label: 'F#', color: '#b845fc' },
  go: { label: 'Go', color: '#00add8' },
  rust: { label: 'Rust', color: '#dea584' },
  ruby: { label: 'Ruby', color: '#701516' },
  php: { label: 'PHP', color: '#4f5d95' },
  swift: { label: 'Swift', color: '#f05138' },
  kotlin: { label: 'Kotlin', color: '#a97bff' },
  scala: { label: 'Scala', color: '#c22d40' },
  dart: { label: 'Dart', color: '#00b4ab' },
  elixir: { label: 'Elixir', color: '#6e4a7e' },
  erlang: { label: 'Erlang', color: '#b83998' },
  haskell: { label: 'Haskell', color: '#5e5086' },
  clojure: { label: 'Clojure', color: '#db5855' },
  lua: { label: 'Lua', color: '#000080' },
  perl: { label: 'Perl', color: '#0298c3' },
  r: { label: 'R', color: '#198ce7' },
  julia: { label: 'Julia', color: '#a270ba' },
  zig: { label: 'Zig', color: '#ec915c' },
  nim: { label: 'Nim', color: '#ffc200' },
  ocaml: { label: 'OCaml', color: '#3be133' },
  groovy: { label: 'Groovy', color: '#4298b8' },
  objectivec: { label: 'Objective-C', color: '#438eff' },
  'objective-c': { label: 'Objective-C', color: '#438eff' },
  html: { label: 'HTML', color: '#e34c26' },
  css: { label: 'CSS', color: '#563d7c' },
  scss: { label: 'SCSS', color: '#c6538c' },
  sass: { label: 'Sass', color: '#a53b70' },
  less: { label: 'Less', color: '#1d365d' },
  vue: { label: 'Vue', color: '#41b883' },
  svelte: { label: 'Svelte', color: '#ff3e00' },
  astro: { label: 'Astro', color: '#ff5a03' },
  json: { label: 'JSON', color: '#cbcb41' },
  jsonc: { label: 'JSON', color: '#cbcb41' },
  yaml: { label: 'YAML', color: '#cb171e' },
  toml: { label: 'TOML', color: '#9c4221' },
  xml: { label: 'XML', color: '#0060ac' },
  markdown: { label: 'Markdown', color: '#083fa1' },
  sql: { label: 'SQL', color: '#e38c00' },
  graphql: { label: 'GraphQL', color: '#e10098' },
  shellscript: { label: 'Shell', color: '#89e051' },
  shell: { label: 'Shell', color: '#89e051' },
  bash: { label: 'Shell', color: '#89e051' },
  powershell: { label: 'PowerShell', color: '#012456' },
  dockerfile: { label: 'Dockerfile', color: '#384d54' },
  makefile: { label: 'Makefile', color: '#427819' },
  plaintext: { label: 'Plain Text', color: '#8a847a' },
}

const FALLBACK_PALETTE = [
  '#ff4d1a',
  '#9cf76d',
  '#863bff',
  '#7dd3fc',
  '#fca5a5',
  '#c4b5fd',
  '#efead8',
  '#e38c00',
]

function hashIndex(value: string, mod: number): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash % mod
}

export function langStyle(lang: string): LangStyle {
  const key = lang.toLowerCase().trim()
  const known = LANG_STYLES[key]
  if (known) return known
  const color = FALLBACK_PALETTE[hashIndex(key, FALLBACK_PALETTE.length)]
  const label = lang.charAt(0).toUpperCase() + lang.slice(1)
  return { label, color }
}
