import { getContext } from "./context"
import type { Logger, Namespace } from "./logger.type"

let namespaceCache = undefined as Namespace[] | undefined

export function _resetNamespaceCache(): void {
	namespaceCache = undefined
}

function getNamespaces(): Namespace[] {
	if (namespaceCache) {
		return namespaceCache
	}
	const configured = process.env["LOG_NAMESPACES"] ?? ""
	namespaceCache = configured
		.split(",")
		.map((namespace) => namespace.trim())
		.filter(Boolean) as Namespace[]

	return namespaceCache
}

function isNamespaceEnabled(namespace: Namespace): boolean {
	const namespaces = getNamespaces()
	return namespaces.includes("*") || namespaces.includes(namespace)
}

function serializeError(error: Error): Record<string, unknown> {
	return { name: error.name, message: error.message, stack: error.stack }
}

function emit(
	consoleFn: (...args: unknown[]) => void,
	namespace: Namespace | undefined,
	msg: string,
	extra: Record<string, unknown>,
): void {
	const context = getContext()
	const contextTag =
		context ? JSON.stringify({ requestId: context.requestId }) : ""
	const namespaceTag = namespace ? ` [${namespace}]` : ""
	const extraStr =
		Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : ""
	consoleFn(`${namespaceTag} ${msg}${extraStr} ${contextTag}`)
}

export const logger = {
	debug(
		namespace: Namespace,
		msg: string,
		extra: Record<string, unknown> = {},
	): void {
		if (!isNamespaceEnabled(namespace)) {
			return
		}
		emit(console.log, namespace, msg, extra)
	},

	info(
		namespace: Namespace,
		msg: string,
		extra: Record<string, unknown> = {},
	): void {
		if (!isNamespaceEnabled(namespace)) {
			return
		}
		emit(console.log, namespace, msg, extra)
	},

	warn(msg: string, extra: Record<string, unknown> = {}): void {
		emit(console.warn, undefined, msg, extra)
	},

	error(errorOrMsg: Error | string, extra: Record<string, unknown> = {}): void {
		const msg = errorOrMsg instanceof Error ? errorOrMsg.message : errorOrMsg
		const errorExtra =
			errorOrMsg instanceof Error ? { error: serializeError(errorOrMsg) } : {}
		emit(console.error, undefined, msg, { ...errorExtra, ...extra })
	},
} satisfies Logger
