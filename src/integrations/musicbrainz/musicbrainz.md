# MusicBrainz

Primary metadata source for album search. Free, no API key, CC0-licensed data, stable UUIDs (MBIDs) usable as permanent cross-reference keys throughout the system.

Docs: https://musicbrainz.org/doc/MusicBrainz_API

## Key entities

MusicBrainz organises music into a hierarchy of entities. The ones relevant to this project:

- **Release Group** — the abstract album concept ("Thriller" as an idea). This is what we search and display.
- **Release** — a specific pressing of a release group (US edition, remaster, deluxe). One release group has many releases. We avoid searching at this level — it returns noisy duplicates.
- **Artist** — a person or band. Each release group has one or more artist credits.
- **Recording** — a specific audio track. Not used yet; relevant if we ever do track-level features.

Full entity list: https://musicbrainz.org/doc/Entity

## What we use

- `GET /ws/2/release-group?query=<q>&fmt=json` — text search returning release groups with artist credits and primary type.

## Constraints

- **Rate limit:** 1 request/second for anonymous clients. A `User-Agent` header is required — missing or generic UAs get blocked.
- **No cover art.** Cover art is served by Cover Art Archive (`coverartarchive.org`), a separate service that uses MBIDs as keys. See the `cover-art` integration.
- **Search is Lucene-based.** Supports field qualifiers (`artist:radiohead`), fuzzy matching, and boolean operators, but relevance ranking can be unpredictable for ambiguous queries.
- **No popularity signal.** Last.fm provides listener/playcount data that MB doesn't. See the `lastfm` integration.
