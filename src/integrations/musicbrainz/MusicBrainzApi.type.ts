// Raw MusicBrainz response shapes — hyphenated keys as the API returns them
export interface MbArtistCredit {
	name: string
	artist: {
		id: string
		name: string
		"sort-name": string
	}
	joinphrase: string
}

export interface MbReleaseGroup {
	id: string
	title: string
	"primary-type"?: string
	"secondary-types": string[]
	"first-release-date": string
	"artist-credit": MbArtistCredit[]
}

export interface MbReleaseGroupSearchResponse {
	"release-groups": MbReleaseGroup[]
	count: number
	offset: number
}

// Normalised shapes exposed to callers
export interface ArtistCredit {
	name: string
	artist: {
		id: string
		name: string
		sortName: string
	}
	joinphrase: string
}

export interface ReleaseGroup {
	id: string
	title: string
	primaryType: string | null
	secondaryTypes: string[]
	firstReleaseDate: string
	artistCredits: ArtistCredit[]
	coverArtUrl: string
}

export interface ReleaseGroupSearchResult {
	releaseGroups: ReleaseGroup[]
	count: number
	offset: number
}

export interface ReleaseGroupSearchOptions {
	limit?: number
	offset?: number
}
