/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { httpMimeNegotiator } from '@hatsy/http-header-value/headers';
import type { RequestHandler, RequestHandlerMethod } from '../../core';
import { HttpError } from '../http-error';
import type { HttpMeans } from '../http.means';
import { addResponseHeader } from '../util';

/**
 * Request processing handlers for accepted MIME types.
 *
 * @typeParam TMeans - Supported HTTP request processing means.
 */
export interface DispatchMimeTypes<TMeans extends HttpMeans = HttpMeans> {

  /**
   * Produces HTML.
   */
  readonly 'text/html'?: RequestHandlerMethod<this, TMeans>;

  /**
   * Produces JSON.
   */
  readonly 'application/json'?: RequestHandlerMethod<this, TMeans>;

  /**
   * Produces any content.
   *
   * This is a fallback handler typically.
   */
  readonly '*/*'?: RequestHandlerMethod<this, TMeans>;

  /**
   * Request processing method with MIME type as its key.
   *
   * MIME can be a wildcard like `image/*` or `* / *`.
   */
  readonly [mimeType: string]: RequestHandlerMethod<this, TMeans> | undefined;

}

/**
 * Dispatches request processing by requested MIME type.
 *
 * Performs [content negotiation] based on [Accept] header. Then calls handler based on negotiation results.
 *
 * Appends `Vary: Accept` header to the response.
 *
 * [content negotiation]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Content_negotiation
 * [Accept]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
 *
 * @param mimeTypes - Request processing handlers for accepted MIME types.
 * @param fallback - Fallback request handler to call when negotiation failed. Issues 406 (Not Acceptable) by default.
 *
 * @returns New HTTP request processing handler.
 */
export function dispatchByAccepted<TMeans extends HttpMeans>(
    mimeTypes: DispatchMimeTypes<TMeans>,
    fallback: RequestHandler<TMeans> = () => Promise.reject(new HttpError(406)),
): RequestHandler<TMeans> {

  const negotiator = httpMimeNegotiator(mimeTypes);

  return async ({ request, response, next }) => {

    const { accept = '*/*' } = request.headers;
    const handler = negotiator(accept);

    if (handler) {
      addResponseHeader(response, 'Vary', 'Accept');
      return next(handler.bind(mimeTypes));
    }

    return next(fallback);
  };
}
