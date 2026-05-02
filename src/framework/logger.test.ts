import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runWithContext } from "./context"
import { logger } from "./logger"
import type { Namespace } from "./logger.type"

describe("logger", () => {
	const capturedLogs: unknown[] = []
	const capturedWarns: unknown[] = []
	const capturedErrors: unknown[] = []

	beforeEach(() => {
		capturedLogs.length = 0
		capturedWarns.length = 0
		capturedErrors.length = 0
		vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
			capturedLogs.push(msg)
		})
		vi.spyOn(console, "warn").mockImplementation((msg: unknown) => {
			capturedWarns.push(msg)
		})
		vi.spyOn(console, "error").mockImplementation((msg: unknown) => {
			capturedErrors.push(msg)
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllEnvs()
	})

	describe("namespace filtering", () => {
		it.each([
			{
				method: "debug" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "musicbrainz",
				shouldEmit: true,
			},
			{
				method: "debug" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "handlers",
				shouldEmit: false,
			},
			{
				method: "info" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "handlers",
				shouldEmit: false,
			},
			{
				method: "debug" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "*",
				shouldEmit: true,
			},
			{
				method: "info" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "*",
				shouldEmit: true,
			},
			{
				method: "debug" as const,
				namespace: "musicbrainz" as Namespace,
				configured: "musicbrainz,handlers",
				shouldEmit: true,
			},
			{
				method: "debug" as const,
				namespace: "handlers" as Namespace,
				configured: "musicbrainz,handlers",
				shouldEmit: true,
			},
		])(
			'$method("$namespace") with LOG_NAMESPACES="$configured" — emits: $shouldEmit',
			({ method, namespace, configured, shouldEmit }) => {
				vi.stubEnv("LOG_NAMESPACES", configured)
				logger[method](namespace, "test message")
				expect(capturedLogs).toHaveLength(shouldEmit ? 1 : 0)
			},
		)

		it.each([
			{
				name: "warn",
				call: () => logger.warn("test"),
				captured: () => capturedWarns,
			},
			{
				name: "error",
				call: () => logger.error("test"),
				captured: () => capturedErrors,
			},
		])(
			"$name always emits regardless of LOG_NAMESPACES",
			({ call, captured }) => {
				vi.stubEnv("LOG_NAMESPACES", "handlers")
				call()
				expect(captured()).toHaveLength(1)
			},
		)
	})

	describe("log entry shape", () => {
		it("includes namespace and message for debug/info", () => {
			vi.stubEnv("LOG_NAMESPACES", "*")
			logger.info("musicbrainz", "searching")
			expect(capturedLogs[0]).toContain("[musicbrainz]")
			expect(capturedLogs[0]).toContain("searching")
		})

		it("routes warn to console.warn", () => {
			logger.warn("something degraded")
			expect(capturedWarns[0]).toContain("something degraded")
			expect(capturedLogs).toHaveLength(0)
		})

		it("routes error to console.error", () => {
			logger.error("something went wrong")
			expect(capturedErrors[0]).toContain("something went wrong")
			expect(capturedLogs).toHaveLength(0)
		})

		it("serializes Error objects", () => {
			const error = new Error("fetch failed")
			logger.error(error)
			expect(capturedErrors[0]).toContain("fetch failed")
			expect(capturedErrors[0]).toContain('"name":"Error"')
		})

		it("accepts a plain string for error without serializing an error object", () => {
			logger.error("something went wrong")
			expect(capturedErrors[0]).not.toContain('"name"')
		})

		it("includes extra fields in output", () => {
			vi.stubEnv("LOG_NAMESPACES", "*")
			logger.info("musicbrainz", "test", { query: "pink floyd" })
			expect(capturedLogs[0]).toContain('"query":"pink floyd"')
		})

		it("includes requestId from AsyncLocalStorage context", async () => {
			vi.stubEnv("LOG_NAMESPACES", "*")
			await runWithContext({ requestId: "req-abc-123" }, async () => {
				logger.info("musicbrainz", "inside context")
			})
			expect(capturedLogs[0]).toContain("req-abc-123")
		})

		it("omits requestId when no context is active", () => {
			vi.stubEnv("LOG_NAMESPACES", "*")
			logger.info("musicbrainz", "outside context")
			expect(capturedLogs[0]).not.toContain("requestId")
		})
	})
})
