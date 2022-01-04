import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HttpConfig } from './http-config';
import type { HttpMeans } from './http.means';

/**
 * @internal
 */
export interface BaseHttpConfig<TMeans extends HttpMeans = HttpMeans> extends HttpConfig<TMeans> {

  handleBy?: undefined;

}

/**
 * @internal
 */
export type AnyHttpConfig<
    TExt,
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    > =
    | BaseHttpConfig<HttpMeans<TRequest, TResponse>>
    | HttpConfig.Extended<TExt, HttpMeans<TRequest, TResponse>>;
