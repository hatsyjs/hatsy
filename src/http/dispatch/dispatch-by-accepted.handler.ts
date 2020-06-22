/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { httpMimeNegotiator } from '@hatsy/http-header-value/headers';
import { RequestHandler, RequestHandlerMethod } from '../../core';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';
import { addResponseHeader } from '../util';

/**
 * Request processing handlers for accepted MIME types.
 *
 * @typeparam TMeans  Supported HTTP request processing means.
 */
export interface DispatchMimeTypes<TMeans extends HttpMeans = HttpMeans> {

  /**
   * Produces HTML.
   */
  'text/html'?: RequestHandlerMethod<this, TMeans>;

  /**
   * Produces JSON.
   */
  'application/json'?: RequestHandlerMethod<this, TMeans>

  /**
   * Produces any content.
   *
   * This is a fallback handler typically.
   */
  '*/*'?: RequestHandlerMethod<this, TMeans>

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
 * Issues 406 (Not Acceptable) error if no matching handler found.
 *
 * [content negotiation]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Content_negotiation
 * [Accept]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
 */
export function dispatchByAccepted<TMeans extends HttpMeans>(
    mimeTypes: DispatchMimeTypes<TMeans>,
): RequestHandler<TMeans> {

  const negotiator = httpMimeNegotiator(mimeTypes);

  return async ({ request, response, next }) => {

    const { accept = '*/*' } = request.headers;
    const handler = negotiator(accept);

    if (!handler) {
      return Promise.reject(new HttpError(406, 'Not Acceptable'));
    }

    addResponseHeader(response, 'Vary', 'Accept');

    await next(handler.bind(mimeTypes));
  };
}
