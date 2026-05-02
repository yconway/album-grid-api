import { getReleaseGroupFrontCoverUrl } from "../coverartarchive/CoverArtArchiveApi"
import { logger } from "../../framework/logger"
import type {
	ArtistCredit,
	MbArtistCredit,
	MbReleaseGroup,
	MbReleaseGroupSearchResponse,
	ReleaseGroup,
	ReleaseGroupSearchOptions,
	ReleaseGroupSearchResult,
} from "./MusicBrainzApi.type"

const BASE_URL = "https://musicbrainz.org/ws/2"
const USER_AGENT = "album-grid/0.1 (contact@yoconway.com)"

export async function searchReleaseGroups(
	query: string,
	options: ReleaseGroupSearchOptions = {},
): Promise<ReleaseGroupSearchResult> {
	const params = new URLSearchParams({
		query,
		fmt: "json",
		limit: String(Math.min(options.limit ?? 25, 100)),
		offset: String(options.offset ?? 0),
	})

	const response = await fetch(
		`${BASE_URL}/release-group?${params.toString()}`,
		{
			headers: { "User-Agent": USER_AGENT },
		},
	)

	if (!response.ok) {
		const body = await response.text()
		logger.error("MusicBrainz search failed", {
			status: response.status,
			statusText: response.statusText,
			body,
		})
		throw new Error(
			`MusicBrainz search failed: ${response.status} ${response.statusText}`,
		)
	}

	const data = (await response.json()) as MbReleaseGroupSearchResponse

	return {
		releaseGroups: data["release-groups"].map(mapReleaseGroup),
		count: data.count,
		offset: data.offset,
	}
}

function mapReleaseGroup(group: MbReleaseGroup): ReleaseGroup {
	return {
		id: group.id,
		title: group.title,
		primaryType: group["primary-type"] ?? null,
		secondaryTypes: group["secondary-types"] ?? [],
		firstReleaseDate: group["first-release-date"],
		artistCredits: group["artist-credit"].map(mapArtistCredit),
		coverArtUrl: getReleaseGroupFrontCoverUrl(group.id),
	}
}

function mapArtistCredit(credit: MbArtistCredit): ArtistCredit {
	return {
		name: credit.name,
		artist: {
			id: credit.artist.id,
			name: credit.artist.name,
			sortName: credit.artist["sort-name"],
		},
		joinphrase: credit.joinphrase,
	}
}
