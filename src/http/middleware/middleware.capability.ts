/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { valueProvider } from '@proc7ts/primitives';
import { RequestCapability, RequestContext, RequestModification } from '../../core';
import { HttpMeans } from '../http.means';
import { Middleware } from './middleware';

/**
 * @internal
 */
class MiddlewareCapability<TInput extends HttpMeans, TExt = object> extends RequestCapability<TInput, TExt> {

  constructor(
      private readonly _middleware: Middleware,
      private readonly _modification: Middleware.Modification<TInput, TExt>,
  ) {
    super();
  }

  async modification<TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ): Promise<RequestModification<TMeans, TExt>> {

    await Middleware.exec(this._middleware, context);

    return this._modification(
        context as RequestContext<TInput>,
    ) as RequestModification<TMeans, TExt> | PromiseLike<RequestModification<TMeans, TExt>>;
  }

}

/**
 * Applies the given `middleware` to HTTP request processing.
 *
 * @category HTTP
 * @typeparam TInput  A type of input HTTP request processing means.
 * @param middleware  Middleware to apply.
 *
 * @returns New processing capability that processes HTTP request by the given `middleware`.
 */
export function middleware<TInput extends HttpMeans>(
    middleware: Middleware,
): RequestCapability<TInput>;

/**
 * Applies the given `middleware` to HTTP request processing and modifies the request processing means with middleware
 * processing result.
 *
 * @typeparam TInput  A type of input HTTP request processing means.
 * @param middleware  Middleware to apply.
 * @param modification  Modification extractor function.
 *
 * @returns New processing capability that processes HTTP request by the given `middleware` and applies the modification
 * done by it.
 */
export function middleware<TInput extends HttpMeans, TExt>(
    middleware: Middleware,
    modification: Middleware.Modification<TInput, TExt>,
): RequestCapability<TInput, TExt>;

export function middleware<TInput extends HttpMeans, TExt>(
    middleware: Middleware,
    modification: Middleware.Modification<TInput, TExt> = valueProvider({} as any),
): RequestCapability<TInput, TExt> {
  return new MiddlewareCapability(middleware, modification);
}
