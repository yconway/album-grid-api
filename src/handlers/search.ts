import { wrapHandler } from "../framework/handler-wrapper"
import { logger } from "../framework/logger"
import { searchReleaseGroups } from "../integrations/musicbrainz/MusicBrainzApi"

export const handler = wrapHandler(async (event) => {
	const query = event.queryStringParameters?.q

	if (!query) {
		return {
			statusCode: 400,
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ error: "q parameter is required" }),
		}
	}

	logger.info("handlers", "search request", { query })

	const result = await searchReleaseGroups(query)

	return {
		statusCode: 200,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(result),
	}
})
