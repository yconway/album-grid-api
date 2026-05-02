import { wrapHandler } from "../framework/handler-wrapper"
import { logger } from "../framework/logger"

export const handler = wrapHandler(async (_event) => {
	logger.info("handlers", "health check")
	return {
		statusCode: 200,
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ status: "ok" }),
	}
})
