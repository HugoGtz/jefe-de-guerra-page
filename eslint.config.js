import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

/** Flat config: TS + Svelte 5, with Prettier turning off stylistic rules. */
export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			// In Svelte markup, `<\/script>` must stay escaped or the template's
			// literal `</script>` token closes the surrounding script context.
			'no-useless-escape': 'off'
		}
	},
	{
		rules: {
			// Allow intentionally-unused args/vars when prefixed with `_`.
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
			],
			// Off: requiring resolve() on every href is a typed-routes migration,
			// not a bug for this app (no base path). Revisit if we adopt it wholesale.
			'svelte/no-navigation-without-resolve': 'off',
			// Warn (not error): the only {@html} sinks render admin-authored content
			// from D1 (About paragraphs) + a JSON.stringify'd JSON-LD blob. Trusted,
			// but kept visible so new sinks get a second look.
			'svelte/no-at-html-tags': 'warn',
			// Warn: our Set usage reassigns (open = next) rather than mutating, so
			// runes reactivity already works; SvelteSet would be churn here.
			'svelte/prefer-svelte-reactivity': 'warn'
		}
	},
	{
		ignores: ['.svelte-kit/', 'build/', 'dist/', 'node_modules/', 'db/schema.sql', 'static/']
	}
);
