import { defineConfig } from "eslint/config"
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import prettierConfig from "eslint-config-prettier"

export default defineConfig(
	eslint.configs.recommended,
	{
		files: ["src/**/*.ts", "test/**/*.ts"],
		extends: tseslint.configs.recommendedTypeChecked,
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.test.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/require-await": "off",
		},
	},
	{
		files: ["*.js"],
		languageOptions: {
			sourceType: "commonjs",
		},
	},
	prettierConfig,
	{
		ignores: ["node_modules/**", "dist/**", ".aws-sam/**"],
	},
)
