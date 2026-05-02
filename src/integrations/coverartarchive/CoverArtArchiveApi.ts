const BASE_URL = "https://coverartarchive.org"

export function getReleaseGroupFrontCoverUrl(musicbrainzId: string): string {
	return `${BASE_URL}/release-group/${musicbrainzId}/front`
}
