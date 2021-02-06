import type { ErrorMeans } from './error.means';
import type { RequestHandler } from './request-handler';
import { requestExtension } from './request-modification';

/**
 * Dispatches request processing error.
 *
 * Processes request with the given handler. If processing fails, processes error with the given `onError` one.
 *
 * @typeParam TMeans - Request processing means.
 * @param onError - Error processing handler.
 * @param handler - Request processing handler to process the original request with.
 *
 * @returns New request processing handler.
 */
export function dispatchError<TMeans>(
    onError: RequestHandler<TMeans & ErrorMeans>,
    handler: RequestHandler<TMeans>,
): RequestHandler<TMeans> {
  return context => context
      .next(handler)
      .catch(error => context.next<ErrorMeans>(onError, requestExtension({ error })));
}
