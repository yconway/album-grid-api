import { afterEach, describe, expect, it, vi } from "vitest"
import { searchReleaseGroups } from "./MusicBrainzApi"
import type {
	MbArtistCredit,
	MbReleaseGroup,
	MbReleaseGroupSearchResponse,
} from "./MusicBrainzApi.type"

function buildMbArtistCredit(
	overrides: Partial<MbArtistCredit> = {},
): MbArtistCredit {
	return {
		name: "Pink Floyd",
		artist: {
			id: "artist-id-1",
			name: "Pink Floyd",
			"sort-name": "Floyd, Pink",
		},
		joinphrase: "",
		...overrides,
	}
}

function buildMbReleaseGroup(
	overrides: Partial<MbReleaseGroup> = {},
): MbReleaseGroup {
	return {
		id: "release-group-id-1",
		title: "The Dark Side of the Moon",
		"primary-type": "Album",
		"secondary-types": [],
		"first-release-date": "1973-03-01",
		"artist-credit": [buildMbArtistCredit()],
		...overrides,
	}
}

function buildMbSearchResponse(
	overrides: Partial<MbReleaseGroupSearchResponse> = {},
): MbReleaseGroupSearchResponse {
	return {
		"release-groups": [buildMbReleaseGroup()],
		count: 1,
		offset: 0,
		...overrides,
	}
}

function stubFetchSuccess(data: unknown): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(data),
		}),
	)
}

function stubFetchError(status: number, statusText: string): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: false,
			status,
			statusText,
			text: () => Promise.resolve(""),
		}),
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("searchReleaseGroups", () => {
	describe("result mapping", () => {
		it("maps hyphenated MB keys to camelCase", async () => {
			stubFetchSuccess(
				buildMbSearchResponse({
					"release-groups": [
						buildMbReleaseGroup({
							id: "rg-123",
							"primary-type": "Album",
							"secondary-types": ["Compilation"],
							"first-release-date": "1973-03-01",
							"artist-credit": [
								buildMbArtistCredit({
									name: "Pink Floyd",
									artist: {
										id: "artist-123",
										name: "Pink Floyd",
										"sort-name": "Floyd, Pink",
									},
									joinphrase: "",
								}),
							],
						}),
					],
				}),
			)

			const result = await searchReleaseGroups("dark side of the moon")
			const releaseGroup = result.releaseGroups[0]

			expect(releaseGroup.primaryType).toBe("Album")
			expect(releaseGroup.secondaryTypes).toEqual(["Compilation"])
			expect(releaseGroup.firstReleaseDate).toBe("1973-03-01")
			expect(releaseGroup.artistCredits[0].artist.sortName).toBe("Floyd, Pink")
		})

		it("maps absent primary-type to null", async () => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { "primary-type": _, ...groupWithoutType } =
				buildMbReleaseGroup()
			stubFetchSuccess(
				buildMbSearchResponse({
					"release-groups": [groupWithoutType as MbReleaseGroup],
				}),
			)

			const result = await searchReleaseGroups("test")
			expect(result.releaseGroups[0].primaryType).toBeNull()
		})

		it("builds coverArtUrl from release group id", async () => {
			stubFetchSuccess(
				buildMbSearchResponse({
					"release-groups": [buildMbReleaseGroup({ id: "mb-uuid-abc" })],
				}),
			)

			const result = await searchReleaseGroups("test")
			expect(result.releaseGroups[0].coverArtUrl).toBe(
				"https://coverartarchive.org/release-group/mb-uuid-abc/front",
			)
		})

		it("passes through count and offset from response", async () => {
			stubFetchSuccess(buildMbSearchResponse({ count: 42, offset: 10 }))

			const result = await searchReleaseGroups("test")
			expect(result.count).toBe(42)
			expect(result.offset).toBe(10)
		})
	})

	describe("query parameters", () => {
		it("uses default limit of 25 and offset of 0 when no options given", async () => {
			stubFetchSuccess(buildMbSearchResponse())

			await searchReleaseGroups("test query")

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
			const url = new URL(calledUrl)
			expect(url.searchParams.get("query")).toBe("test query")
			expect(url.searchParams.get("limit")).toBe("25")
			expect(url.searchParams.get("offset")).toBe("0")
		})

		it("passes custom limit and offset", async () => {
			stubFetchSuccess(buildMbSearchResponse())

			await searchReleaseGroups("test", { limit: 10, offset: 5 })

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
			const url = new URL(calledUrl)
			expect(url.searchParams.get("limit")).toBe("10")
			expect(url.searchParams.get("offset")).toBe("5")
		})

		it("caps limit at 100", async () => {
			stubFetchSuccess(buildMbSearchResponse())

			await searchReleaseGroups("test", { limit: 200 })

			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
			const url = new URL(calledUrl)
			expect(url.searchParams.get("limit")).toBe("100")
		})
	})

	describe("error handling", () => {
		it("throws with status when response is not ok", async () => {
			stubFetchError(503, "Service Unavailable")

			await expect(searchReleaseGroups("test")).rejects.toThrow(
				"MusicBrainz search failed: 503 Service Unavailable",
			)
		})
	})
})
