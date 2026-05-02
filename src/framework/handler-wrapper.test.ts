import { describe, expect, it } from "vitest"
import { getContext } from "./context"
import { wrapHandler } from "./handler-wrapper"
import type { APIGatewayProxyEventV2 } from "aws-lambda"

function buildMockEvent(requestId: string): APIGatewayProxyEventV2 {
	return {
		requestContext: { requestId },
	} as unknown as APIGatewayProxyEventV2
}

describe("wrapHandler", () => {
	it("sets requestId in AsyncLocalStorage context during handler execution", async () => {
		let capturedRequestId: string | undefined

		const handler = wrapHandler(async (_event) => {
			capturedRequestId = getContext()?.requestId
			return { statusCode: 200, body: "" }
		})

		await handler(buildMockEvent("req-xyz-789"), {} as never, () => {})

		expect(capturedRequestId).toBe("req-xyz-789")
	})

	it("returns the inner handler result", async () => {
		const handler = wrapHandler(async (_event) => ({
			statusCode: 201,
			body: JSON.stringify({ created: true }),
		}))

		const result = await handler(
			buildMockEvent("req-123"),
			{} as never,
			() => {},
		)

		expect(result).toMatchObject({ statusCode: 201 })
	})

	it("context is cleared between invocations", async () => {
		const capturedIds: (string | undefined)[] = []

		const handler = wrapHandler(async (_event) => {
			capturedIds.push(getContext()?.requestId)
			return { statusCode: 200, body: "" }
		})

		await handler(buildMockEvent("first-request"), {} as never, () => {})
		await handler(buildMockEvent("second-request"), {} as never, () => {})

		expect(capturedIds).toEqual(["first-request", "second-request"])
	})
})
