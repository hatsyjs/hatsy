/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { asis } from '@proc7ts/primitives';
import { URLSearchParams } from 'url';
import {
  RequestBodyMeans,
  RequestCapability,
  RequestContext,
  requestExtension,
  RequestModification,
  RequestValueTransformer,
} from '../../core';
import { readAll, Text__MIME, URLEncoded__MIME } from '../../impl';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';

/**
 * @internal
 */
const URL_ENCODED_MIMES: Record<string, number> = {
  [Text__MIME]: 1,
  [URLEncoded__MIME]: 1,
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
 * @category HTTP
 * @typeparam TInput  Input HTTP request processing means.
 */
export interface FormDecoding<TInput extends HttpMeans = HttpMeans, TBody = URLSearchParams>
    extends RequestCapability<TInput, RequestBodyMeans<TBody>> {

  /**
   * Configures form decoding capability to transform submitted form.
   *
   * @typeparam TMeans  HTTP request processing means.
   * @typeparam TTransformed  Transformed request body type.
   * @param transformer  Transformer function.
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

  constructor(private readonly _transform: RequestValueTransformer<TInput, URLSearchParams, TBody>) {
    super();
  }

  async modification<TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ): Promise<RequestModification<TMeans, RequestBodyMeans<TBody>>> {

    const { request } = context;
    const { 'content-type': contentType = Text__MIME } = request.headers;

    if (!URL_ENCODED_MIMES[contentType]) {
      return Promise.reject(new HttpError(415, `${URLEncoded__MIME} request expected`));
    }

    const params = new URLSearchParams(await readAll(request));

    return requestExtension<TMeans, RequestBodyMeans<TBody>>({
      requestBody: await this._transform(params, context as RequestContext<TInput>),
    });
  }

  withBody<TMeans extends TInput, TNextBody>(
      transformer: RequestValueTransformer<TMeans, URLSearchParams, TNextBody>,
  ): FormDecoding<TMeans, TNextBody> {
    return new FormDecodingCapability<TMeans, TNextBody>(transformer);
  }

}

/**
 * URL-encoded form decoding capability.
 *
 * Represents form data submitted as `application/x-www-form-urlencoded` as a {@link RequestBodyMeans.requestBody
 * request body} of type `URLSearchParams`.
 *
 * @category HTTP
 */
export const FormDecoding: FormDecoding = new FormDecodingCapability(asis);