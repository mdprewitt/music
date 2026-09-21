import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ]),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  ...pluginVueA11y.configs['flat/recommended'],

  {
    name: 'app/a11y-overrides',
    files: ['**/*.vue'],
    rules: {
      // The plugin's default requires *both* wrapping the control and a
      // for/id pair on every label — real HTML only ever needs one or the
      // other. `some` is what WCAG (and every native <label>) actually
      // requires; every label in this codebase already satisfies it one way
      // or the other.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },

  {
    // Each of these has one deliberate handler on a non-interactive element
    // by the plugin's ARIA-role model — a native <dialog>'s @click.self
    // backdrop-dismiss (About/LicenseDialog), or a role="group" delegating
    // to already-interactive descendants (DropZone's drag-and-drop div,
    // InlineSheet's root) — see the comment above each file's watch()/
    // onKeydown(). Disabled per-file, not per-line: an inline template
    // comment immediately before an SFC's own single root element makes Vue
    // treat the component as multi-root, which breaks @vue/test-utils's
    // wrapper.classes()/attributes()/trigger() — confirmed empirically.
    name: 'app/a11y-root-element-delegation',
    files: [
      'src/components/AboutDialog.vue',
      'src/components/LicenseDialog.vue',
      'src/components/DropZone.vue',
      'src/components/InlineSheet.vue',
    ],
    rules: {
      'vuejs-accessibility/no-static-element-interactions': 'off',
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
