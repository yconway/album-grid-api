import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig(
	eslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		extends: tseslint.configs.recommendedTypeChecked,
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
	{
		files: ['*.js'],
		languageOptions: {
			sourceType: 'commonjs',
		},
	},
	prettierConfig,
	{
		ignores: ['node_modules/**', 'dist/**'],
	},
)
