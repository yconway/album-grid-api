import { describe, expect, it } from "vitest"
import type { APIGatewayProxyEventV2 } from "aws-lambda"
import { handler } from "./health"

describe("health handler", () => {
	it("returns 200 with status ok", async () => {
		const event = {
			requestContext: { requestId: "test-request-id" },
		} as unknown as APIGatewayProxyEventV2

		const result = await handler(event, {} as never, () => {})

		expect(result).toMatchObject({
			statusCode: 200,
			body: JSON.stringify({ status: "ok" }),
		})
	})
})
