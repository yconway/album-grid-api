import { describe, expect, it } from "vitest"
import { getReleaseGroupFrontCoverUrl } from "./CoverArtArchiveApi"

describe("getReleaseGroupFrontCoverUrl", () => {
	it("builds the expected CAA URL from a musicbrainz id", () => {
		expect(
			getReleaseGroupFrontCoverUrl("f5093c06-23e3-404f-aeaa-37d6125f1571"),
		).toBe(
			"https://coverartarchive.org/release-group/f5093c06-23e3-404f-aeaa-37d6125f1571/front",
		)
	})
})
