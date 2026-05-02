import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		include: ["**/*.localtest.ts"],
		testTimeout: 15000,
	},
})
