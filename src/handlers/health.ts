import type { APIGatewayProxyHandlerV2 } from "aws-lambda"

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
	const requestId = event.requestContext.requestId
	console.log(
		JSON.stringify({
			level: "info",
			requestId,
			msg: "health check",
		}),
	)
	return {
		statusCode: 200,
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ status: "ok" }),
	}
}
