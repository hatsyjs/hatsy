/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { URLSearchParams } from 'url';
import { RequestBodyMeans, requestExtension, RequestHandler } from '../../core';
import { readAll, Text__MIME, URLEncoded__MIME } from '../../impl';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';

/**
 * @internal
 */
const URL_ENCODED_MIME: Record<string, number> = { [Text__MIME]: 1, [URLEncoded__MIME]: 1 };

/**
 * Builds HTTP request processing handler that decodes submitted URL-encoded forms.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as a {@link RequestBodyMeans.requestBody
 * request body} of type `URLSearchParams`. Then delegates to the next handler accepting it.
 *
 * Responds with 415 (Unsupported Media Type) status code if request has content type specified, and it is not
 * `application/x-www-form-urlencoded` or `text/plain`.
 *
 * @category HTTP
 * @typeparam TMeans  HTTP request processing means.
 * @param handler  HTTP request processing handler that will receive request body.
 *
 * @returns New HTTP request processing handler.
 */
export function urlDecodeForm<TMeans extends HttpMeans>(
    handler: RequestHandler<TMeans & RequestBodyMeans<URLSearchParams>>,
): RequestHandler<TMeans> {
  return async ({ request, next }) => {

    const { 'content-type': contentType = Text__MIME } = request.headers;

    if (!URL_ENCODED_MIME[contentType]) {
      return Promise.reject(new HttpError(415, `${URLEncoded__MIME} request expected`));
    }

    await next(
        handler,
        requestExtension<TMeans, RequestBodyMeans<URLSearchParams>>({
          requestBody: new URLSearchParams(await readAll(request)),
        }),
    );
  };
}
