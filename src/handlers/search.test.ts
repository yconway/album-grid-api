import { afterEach, describe, expect, it, vi } from "vitest"
import type { APIGatewayProxyEventV2 } from "aws-lambda"

vi.mock("../integrations/musicbrainz/MusicBrainzApi", () => ({
	searchReleaseGroups: vi.fn(),
}))

import { handler } from "./search"
import { searchReleaseGroups } from "../integrations/musicbrainz/MusicBrainzApi"
import type { ReleaseGroupSearchResult } from "../integrations/musicbrainz/MusicBrainzApi.type"

function buildEvent(
	queryStringParameters?: Record<string, string>,
): APIGatewayProxyEventV2 {
	return {
		requestContext: { requestId: "test-request-id" },
		queryStringParameters,
	} as unknown as APIGatewayProxyEventV2
}

const emptySearchResult: ReleaseGroupSearchResult = {
	releaseGroups: [],
	count: 0,
	offset: 0,
}

afterEach(() => {
	vi.clearAllMocks()
})

describe("search handler", () => {
	it("returns 400 when q parameter is absent", async () => {
		const result = await handler(buildEvent(), {} as never, () => {})

		expect(result).toMatchObject({
			statusCode: 400,
			body: JSON.stringify({ error: "q parameter is required" }),
		})
	})

	it("returns 400 when queryStringParameters has no q", async () => {
		const result = await handler(buildEvent({}), {} as never, () => {})

		expect(result).toMatchObject({
			statusCode: 400,
			body: JSON.stringify({ error: "q parameter is required" }),
		})
	})

	it("returns 200 with search results for a valid query", async () => {
		vi.mocked(searchReleaseGroups).mockResolvedValue(emptySearchResult)

		const result = await handler(
			buildEvent({ q: "pink floyd" }),
			{} as never,
			() => {},
		)

		expect(result).toMatchObject({
			statusCode: 200,
			body: JSON.stringify(emptySearchResult),
		})
	})

	it("calls searchReleaseGroups with the query string", async () => {
		vi.mocked(searchReleaseGroups).mockResolvedValue(emptySearchResult)

		await handler(buildEvent({ q: "radiohead" }), {} as never, () => {})

		expect(searchReleaseGroups).toHaveBeenCalledWith("radiohead")
	})
})
