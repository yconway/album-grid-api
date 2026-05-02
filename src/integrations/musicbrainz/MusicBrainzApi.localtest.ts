import { describe, it, expect } from "vitest"
import { searchReleaseGroups } from "./MusicBrainzApi"
import type { ReleaseGroup } from "./MusicBrainzApi.type"

function buildCombinedQuery(input: string): string {
	return `(artist:"${input}" OR releasegroup:"${input}")`
}

function findAlbum(
	results: ReleaseGroup[],
	titleFragment: string,
	artistFragment: string,
): ReleaseGroup | undefined {
	return results.find(
		(rg) =>
			rg.title.toLowerCase().includes(titleFragment.toLowerCase()) &&
			rg.artistCredits.some((credit) =>
				credit.artist.name.toLowerCase().includes(artistFragment.toLowerCase()),
			),
	)
}

describe("MusicBrainzApi search strategies", () => {
	describe("raw query", () => {
		it("finds Franz Ferdinand self-titled album", async () => {
			const result = await searchReleaseGroups("Franz Ferdinand", { limit: 5 })
			console.log(JSON.stringify(result, null, 2))
			const match = findAlbum(
				result.releaseGroups,
				"Franz Ferdinand",
				"Franz Ferdinand",
			)
			expect(match).toBeDefined()
		})

		it("fails to find Dark Side of the Moon with title-only query", async () => {
			const result = await searchReleaseGroups("Dark Side of the Moon", {
				limit: 5,
			})
			console.log(JSON.stringify(result, null, 2))
			const match = findAlbum(
				result.releaseGroups,
				"Dark Side of the Moon",
				"Pink Floyd",
			)
			expect(match).toBeUndefined()
		})

		it("finds Travelling Without Moving with artist included", async () => {
			const result = await searchReleaseGroups(
				"Travelling Without Moving Jamiroquai",
				{ limit: 5 },
			)
			console.log(JSON.stringify(result, null, 2))
			const match = findAlbum(
				result.releaseGroups,
				"Travelling Without Moving",
				"Jamiroquai",
			)
			expect(match).toBeDefined()
		})
	})

	describe("combined field query (artist OR releasegroup)", () => {
		it("finds Dark Side of the Moon by title alone", async () => {
			const result = await searchReleaseGroups(
				buildCombinedQuery("Dark Side of the Moon"),
				{ limit: 5 },
			)
			const match = findAlbum(result.releaseGroups, "Dark Side", "Pink Floyd")
			expect(match).toBeDefined()
		})

		it("finds Dark Side of the Moon by shortened title", async () => {
			const result = await searchReleaseGroups(
				buildCombinedQuery("dark side"),
				{ limit: 5 },
			)
			const match = findAlbum(result.releaseGroups, "Dark Side", "Pink Floyd")
			expect(match).toBeDefined()
		})

		it("finds Dark Side of the Moon by artist name alone", async () => {
			const result = await searchReleaseGroups(
				buildCombinedQuery("pink floyd"),
				{ limit: 5 },
			)
			const match = findAlbum(result.releaseGroups, "Dark Side", "Pink Floyd")
			expect(match).toBeDefined()
		})

		it("finds Dark Side of the Moon by artist + partial title", async () => {
			const result = await searchReleaseGroups(
				buildCombinedQuery("pink floyd dark side"),
				{ limit: 5 },
			)
			const match = findAlbum(result.releaseGroups, "Dark Side", "Pink Floyd")
			expect(match).toBeDefined()
		})

		it("finds The Beatles White Album", async () => {
			const result = await searchReleaseGroups(
				buildCombinedQuery("White Album Beatles"),
				{ limit: 5 },
			)
			const match = findAlbum(result.releaseGroups, "Beatles", "Beatles")
			expect(match).toBeDefined()
		})
	})
})
