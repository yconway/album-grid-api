import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyHandlerV2,
	APIGatewayProxyResultV2,
} from "aws-lambda"
import { runWithContext } from "./context"

type InnerHandler = (
	event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyResultV2>

export function wrapHandler(handler: InnerHandler): APIGatewayProxyHandlerV2 {
	return async (event) => {
		//TODO error handling
		const requestId = event.requestContext.requestId
		return runWithContext({ requestId }, () => handler(event))
	}
}
