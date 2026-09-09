/// <reference types="vite/client" />

// `bun run type-check` runs `vue-tsc` under Bun. Volar patches `tsc` by
// intercepting `fs.readFileSync`, but Bun's CJS `require()` of
// `typescript/lib/tsc.js` bypasses that hook, so `vue-tsc` silently falls back
// to plain `tsc` — which has no built-in knowledge of `.vue` files and reports
// every `import … from './Foo.vue'` in a `.ts` file as TS2307. This shim gives
// plain `tsc` a module type for them. (With a real Node runtime for `vue-tsc`
// the shim is harmless — Volar's own `.vue` types take precedence.)
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
