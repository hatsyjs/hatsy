import { httpLanguageNegotiator } from 'http-header-value/headers.js';
import { RequestHandler, RequestHandlerMethod } from '../../core/request-handler.js';
import { HttpError } from '../http-error.js';
import type { HttpMeans } from '../http.means.js';
import { addResponseHeader } from '../util/add-response-header.js';

/**
 * Request processing handlers for accepted languages.
 *
 * @typeParam TMeans - Supported HTTP request processing means.
 */
export interface DispatchLanguages<TMeans extends HttpMeans = HttpMeans> {
  /**
   * English response.
   */
  en?: RequestHandlerMethod<this, TMeans> | undefined;

  /**
   * Response in any language.
   *
   * This is a fallback handler typically.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  '*'?: RequestHandlerMethod<this, TMeans> | undefined;

  /**
   * Request processing method with language code as its key.
   *
   * Language code can be a `*` wildcard.
   */
  readonly [code: string]: RequestHandlerMethod<this, TMeans> | undefined;
}

/**
 * Dispatches request processing by requested language.
 *
 * Performs [content negotiation] based on [Accept-Language] header. Then calls handler based on negotiation results.
 *
 * Appends `Vary: Accept-Language` header to the response.
 *
 * Issues 406 (Not Acceptable) error if no matching handler found.
 *
 * [content negotiation]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Content_negotiation
 * [Accept-Language]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
 */
export function dispatchByLanguage<TMeans extends HttpMeans>(
  languages: DispatchLanguages<TMeans>,
): RequestHandler<TMeans> {
  const negotiator = httpLanguageNegotiator(languages);

  return ({ request, response, next }) => {
    const { 'accept-language': acceptLanguage = '*' } = request.headers;
    const handler = negotiator(acceptLanguage);

    if (!handler) {
      return Promise.reject(new HttpError(406));
    }

    addResponseHeader(response, 'Vary', 'Accept-Language');

    return next(handler.bind(languages));
  };
}
