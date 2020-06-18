/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { URLSearchParams } from 'url';
import { RequestBodyMeans, requestExtension, RequestHandler } from '../../core';
import { readAll } from '../../impl';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';

/**
 * Builds HTTP request processing handler that decodes submitted URL-encoded forms.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as a {@link RequestBodyMeans.requestBody
 * request body} of type `URLSearchParams`. Then delegates to the next handler accepting it.
 *
 * Responds with 415 (Unsupported Media Type) status code if request is not `application/x-www-form-urlencoded`.
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
    if (request.headers['content-type'] !== 'application/x-www-form-urlencoded') {
      return Promise.reject(new HttpError(415, 'application/x-www-form-urlencoded request expected'));
    }

    await next(
        handler,
        requestExtension<TMeans, RequestBodyMeans<URLSearchParams>>({
          requestBody: new URLSearchParams(await readAll(request)),
        }),
    );
  };
}
