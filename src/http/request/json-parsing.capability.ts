/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { asis } from '@proc7ts/primitives';
import {
  RequestBodyMeans,
  RequestCapability,
  RequestContext,
  requestExtension,
  RequestModification,
  RequestModifier__symbol,
  RequestValueTransformer,
} from '../../core';
import { JSON__MIME, readAll, Text__MIME, TextJSON__MIME } from '../../impl';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';
import { FormDecoding } from './form-decoding.capability';

/**
 * @internal
 */
const JSON_MIMES: Record<string, number> = {
  [Text__MIME]: 1,
  [JSON__MIME]: 1,
  [TextJSON__MIME]: 1,
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
 * @category HTTP
 * @typeparam TInput  Input HTTP request processing means.
 * @typeparam TBody  Request body type.
 */
export interface JsonParsing<TInput extends HttpMeans = HttpMeans, TBody = any>
    extends RequestCapability<TInput, RequestBodyMeans<TBody>> {

  /**
   * Configures JSON parsing capability to transform submitted data.
   *
   * @typeparam TMeans  HTTP request processing means.
   * @typeparam TTransformed  Transformed request body type.
   * @param transformer  Transformer function.
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

  constructor(private readonly _transform: RequestValueTransformer<TInput, any, TBody>) {
    super();
  }

  get [RequestModifier__symbol](): JsonParsing {
    return JsonParsing; // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  async modification<TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ): Promise<RequestModification<TMeans, RequestBodyMeans<TBody>>> {

    const { request } = context;
    const { 'content-type': contentType = Text__MIME } = request.headers;

    if (!JSON_MIMES[contentType]) {
      return Promise.reject(new HttpError(415, `${JSON__MIME} request expected`));
    }

    let json: any;
    const text = await readAll(request);

    try {
      json = JSON.parse(text);
    } catch (e) {
      return Promise.reject(new HttpError(400, e.message));
    }

    return requestExtension<TMeans, RequestBodyMeans<TBody>>({
      requestBody: await this._transform(json, context as RequestContext<TInput>),
    });
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
 *
 * @category HTTP
 */
export const JsonParsing: JsonParsing = new JsonParsingCapability(asis);
