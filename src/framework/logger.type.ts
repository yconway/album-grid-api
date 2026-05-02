export type Namespace = "*" | "musicbrainz" | "handlers"

export interface Logger {
	debug: (
		namespace: Namespace,
		msg: string,
		extra?: Record<string, unknown>,
	) => void
	info: (
		namespace: Namespace,
		msg: string,
		extra?: Record<string, unknown>,
	) => void
	warn: (msg: string, extra?: Record<string, unknown>) => void
	error: (errorOrMsg: Error | string, extra?: Record<string, unknown>) => void
}
