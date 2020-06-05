/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyContext } from './context';

/**
 * Request processing handler signature.
 *
 * Handler implementations expect a request processing context containing specific processing matters.
 * E.g. the ones for {@link HTTPMatters HTTP request processing}. The handler may either respond using the provided
 * matters, or delegate to {@link HatsyContext.Agent.next next handler}.
 *
 * The handler may be asynchronous.
 *
 * @category Core
 * @typeparam TMatter  A type of request processing matters this handler expects.
 */
export type HatsyHandler<TMatters> =
/**
 * @param context  Request processing context containing processing matters.
 *
 * @returns Either nothing if the handler completed its work synchronously, or a promise resolved when the handler
 * completed its work asynchronously.
 */
    (
        this: void,
        context: HatsyContext<TMatters>,
    ) => PromiseLike<void> | void;

/**
 * Builds a request processing handler that delegates request processing to other handlers.
 *
 * It iterates over the given handlers in order and delegates the request processing to them. It stops when either
 * response is complete, an error thrown, or there is no more handlers.
 *
 * @category Core
 * @typeparam TMatters  A type of request processing matters the `handlers` expect.
 * @param handlers  Either single handler or iterable of handlers to delegate request processing to.
 *
 * @returns Request processing handler.
 */
export function hatsyHandler<TMatters>(
    handlers: HatsyHandler<TMatters> | Iterable<HatsyHandler<TMatters>>,
): HatsyHandler<TMatters> {
  if (typeof handlers === 'function') {
    return handlers;
  }
  return async (context: HatsyContext<TMatters>): Promise<void> => {
    for (const handler of handlers) {
      if (await context.next(handler)) {
        return;
      }
    }
    return;
  };
}
