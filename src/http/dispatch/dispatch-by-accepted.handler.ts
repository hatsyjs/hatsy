import { httpMimeNegotiator } from 'http-header-value/headers.js';
import { HttpError } from '../http-error.js';
import type { HttpMeans } from '../http.means.js';
import { RequestHandler, RequestHandlerMethod } from '../../core/request-handler.js';
import { addResponseHeader } from '../util/add-response-header.js';

/**
 * Request processing handlers for accepted MIME types.
 *
 * @typeParam TMeans - Supported HTTP request processing means.
 */
export interface DispatchMimeTypes<TMeans extends HttpMeans = HttpMeans> {
  /**
   * Produces HTML.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly 'text/html'?: RequestHandlerMethod<this, TMeans> | undefined;

  /**
   * Produces JSON.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly 'application/json'?: RequestHandlerMethod<this, TMeans> | undefined;

  /**
   * Produces any content.
   *
   * This is a fallback handler typically.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly '*/*'?: RequestHandlerMethod<this, TMeans> | undefined;

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
