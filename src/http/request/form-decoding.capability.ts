import { asis } from '@proc7ts/primitives';
import { URLSearchParams } from 'node:url';
import {
  RequestBodyMeans,
  RequestCapability,
  RequestContext,
  requestExtension,
  RequestHandler,
  RequestValueTransformer,
} from '../../core';
import { readAll } from '../../impl';
import { HttpError } from '../http-error';
import type { HttpMeans } from '../http.means';

/**
 * @internal
 */
const URL_ENCODED_MIMES: Record<string, number> = {
  'text/plain': 1,
  'application/x-www-form-urlencoded': 1,
};

/**
 * URL-encoded form decoding capability.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as a {@link RequestBodyMeans.requestBody
 * request body} of type `URLSearchParams`, or optionally transforms it to another type.
 *
 * Responds with 415 (Unsupported Media Type) status code if request has content type specified, and it is not
 * `application/x-www-form-urlencoded` or `text/plain`.
 *
 * @typeParam TInput - Input HTTP request processing means.
 * @typeParam TBody - Request body type.
 */
export interface FormDecoding<TInput extends HttpMeans = HttpMeans, TBody = URLSearchParams>
  extends RequestCapability<TInput, RequestBodyMeans<TBody>> {
  /**
   * Configures form decoding capability to transform submitted form.
   *
   * @typeParam TMeans - HTTP request processing means.
   * @typeParam TTransformed - Transformed request body type.
   * @param transformer - Transformer function.
   *
   * @returns New form decoding capability.
   */
  withBody<TMeans extends TInput, TTransformed>(
    transformer: RequestValueTransformer<TMeans, URLSearchParams, TTransformed>,
  ): FormDecoding<TMeans, TTransformed>;
}

/**
 * @internal
 */
class FormDecodingCapability<TInput extends HttpMeans, TBody>
  extends RequestCapability<TInput, RequestBodyMeans<TBody>>
  implements FormDecoding<TInput, TBody> {

  readonly #transform: RequestValueTransformer<TInput, URLSearchParams, TBody>;

  constructor(transform: RequestValueTransformer<TInput, URLSearchParams, TBody>) {
    super();
    this.#transform = transform;
  }

  for<TMeans extends TInput>(
    handler: RequestHandler<TMeans & RequestBodyMeans<TBody>>,
  ): RequestHandler<TMeans> {
    return async context => {
      const { request } = context;
      const { 'content-type': contentType = 'text/plain' } = request.headers;

      if (!URL_ENCODED_MIMES[contentType]) {
        return Promise.reject(
          new HttpError(415, { details: `application/x-www-form-urlencoded request expected` }),
        );
      }

      const params = new URLSearchParams(await readAll(request));

      return context.next(
        handler,
        requestExtension<TMeans, RequestBodyMeans<TBody>>({
          requestBody: await this.#transform(params, context as RequestContext<TInput>),
        }),
      );
    };
  }

  withBody<TMeans extends TInput, TTransformed>(
    transformer: RequestValueTransformer<TMeans, URLSearchParams, TTransformed>,
  ): FormDecoding<TMeans, TTransformed> {
    return new FormDecodingCapability<TMeans, TTransformed>(transformer);
  }

}

/**
 * URL-encoded form decoding capability.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as a {@link RequestBodyMeans.requestBody
 * request body} of type `URLSearchParams`.
 */
export const FormDecoding: FormDecoding = new FormDecodingCapability(asis);
