/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { asis } from '@proc7ts/primitives';
import { URLSearchParams } from 'url';
import { RequestBodyMeans, RequestBodyTransformer, requestExtension, RequestHandler } from '../../core';
import { readAll, Text__MIME, URLEncoded__MIME } from '../../impl';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';

/**
 * @internal
 */
const URL_ENCODED_MIME: Record<string, number> = { [Text__MIME]: 1, [URLEncoded__MIME]: 1 };

/**
 * Builds HTTP request processing handler that decodes submitted URL-encoded form.
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
): RequestHandler<TMeans>;

/**
 * Builds HTTP request processing handler that decodes submitted URL-encoded form and transforms it.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as `URLSearchParams` instance and transforms
 * it with the given `transformer` function to {@link RequestBodyMeans.requestBody request body}. Then delegates to the
 * next handler accepting it.
 *
 * Responds with 415 (Unsupported Media Type) status code if request has content type specified, and it is not
 * `application/x-www-form-urlencoded` or `text/plain`.
 *
 * @category HTTP
 * @typeparam TMeans  HTTP request processing means.
 * @typeparam TBody  Transformed request body type.
 * @param transformer  Transformer function.
 * @param handler  HTTP request processing handler that will receive request body.
 *
 * @returns New HTTP request processing handler.
 */
export function urlDecodeForm<TMeans extends HttpMeans, TBody>(
    transformer: RequestBodyTransformer<TMeans, URLSearchParams, TBody>,
    handler: RequestHandler<TMeans & RequestBodyMeans<TBody>>,
): RequestHandler<TMeans>;

export function urlDecodeForm<TMeans extends HttpMeans, TBody = URLSearchParams>(
    transformerOrHandler:
        | RequestBodyTransformer<TMeans, URLSearchParams, TBody>
        | RequestHandler<TMeans & RequestBodyMeans<TBody>>,
    handler?: RequestHandler<TMeans & RequestBodyMeans<TBody>>,
): RequestHandler<TMeans> {

  let transformer: RequestBodyTransformer<TMeans, URLSearchParams, TBody>
  let bodyHandler: RequestHandler<TMeans & RequestBodyMeans<TBody>>;

  if (handler) {
    transformer = transformerOrHandler as RequestBodyTransformer<TMeans, URLSearchParams, TBody>;
    bodyHandler = handler;
  } else {
    transformer = asis as RequestBodyTransformer<TMeans, URLSearchParams, TBody>;
    bodyHandler = transformerOrHandler as RequestHandler<TMeans & RequestBodyMeans<TBody>>;
  }

  return async context => {

    const { request, next } = context;
    const { 'content-type': contentType = Text__MIME } = request.headers;

    if (!URL_ENCODED_MIME[contentType]) {
      return Promise.reject(new HttpError(415, `${URLEncoded__MIME} request expected`));
    }

    const params = new URLSearchParams(await readAll(request));

    await next(
        bodyHandler,
        requestExtension<TMeans, RequestBodyMeans<TBody>>({
          requestBody: await transformer(params, context),
        }),
    );
  };
}
