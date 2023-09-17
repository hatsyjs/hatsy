import { asis } from '@proc7ts/primitives';
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
import type { FormDecoding } from './form-decoding.capability';

/**
 * @internal
 */
const JSON_MIMES: Readonly<Record<string, number>> = {
  'text/plain': 1,
  'application/json': 1,
  'text/json': 1,
};

/**
 * JSON request body parsing capability.
 *
 * Attempts to parse requested data as JSON, and optionally transforms it to another type.
 *
 * Responds with 415 (Unsupported Media Type) status code if request has content type specified, and it is not
 * `application/json`, `text/json`, or `text/plain`.
 *
 * Responds with 400 (Bad Request) status code if failed to parse JSON.
 *
 * @typeParam TInput - Input HTTP request processing means.
 * @typeParam TBody - Request body type.
 */
export interface JsonParsing<TInput extends HttpMeans = HttpMeans, TBody = any>
  extends RequestCapability<TInput, RequestBodyMeans<TBody>> {
  /**
   * Configures JSON parsing capability to transform submitted data.
   *
   * @typeParam TMeans - HTTP request processing means.
   * @typeParam TTransformed - Transformed request body type.
   * @param transformer - Transformer function.
   *
   * @returns New JSON parsing capability.
   */
  withBody<TMeans extends TInput, TTransformed>(
    transformer: RequestValueTransformer<TMeans, any, TTransformed>,
  ): FormDecoding<TMeans, TTransformed>;
}

/**
 * @internal
 */
class JsonParsingCapability<TInput extends HttpMeans, TBody>
  extends RequestCapability<TInput, RequestBodyMeans<TBody>>
  implements JsonParsing<TInput, TBody> {

  readonly #transform: RequestValueTransformer<TInput, any, TBody>;

  constructor(transform: RequestValueTransformer<TInput, any, TBody>) {
    super();
    this.#transform = transform;
  }

  for<TMeans extends TInput>(
    handler: RequestHandler<TMeans & RequestBodyMeans<TBody>>,
  ): RequestHandler<TMeans> {
    return async context => {
      const { request, next } = context;
      const { 'content-type': contentType = 'text/plain' } = request.headers;

      if (!JSON_MIMES[contentType]) {
        return Promise.reject(new HttpError(415, { details: `application/json request expected` }));
      }

      let json: unknown;
      const text = await readAll(request);

      try {
        json = JSON.parse(text);
      } catch (e) {
        return Promise.reject(new HttpError(400, { details: 'Malformed JSON', reason: e }));
      }

      return next(
        handler,
        requestExtension<TMeans, RequestBodyMeans<TBody>>({
          requestBody: await this.#transform(json, context as RequestContext<TInput>),
        }),
      );
    };
  }

  withBody<TMeans extends TInput, TTransformed>(
    transformer: RequestValueTransformer<TMeans, any, TTransformed>,
  ): FormDecoding<TMeans, TTransformed> {
    return new JsonParsingCapability<TMeans, TTransformed>(transformer);
  }

}

/**
 * JSON request body parsing capability.
 *
 * Parses request body as JSON.
 */
export const JsonParsing: JsonParsing = new JsonParsingCapability(asis);
