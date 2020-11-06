/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HttpAddressRep } from '@hatsy/http-header-value/node';
import { lazyValue, noop } from '@proc7ts/primitives';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  dispatchError,
  ErrorMeans,
  LoggerMeans,
  Logging,
  RequestContext,
  RequestHandler,
  requestProcessor,
} from '../core';
import { HttpError } from './http-error';
import type { HttpMeans } from './http.means';
import { renderHttpError } from './render';

/**
 * HTTP processing configuration.
 *
 * @typeParam TMeans  A type of supported HTTP request processing means.
 */
export interface HttpConfig<TMeans extends HttpMeans = HttpMeans> {

  /**
   * Default HTTP request handler.
   *
   * This handler will be called after all other handlers when response is not generated.
   *
   * When set to `false` the default response won't be generated.
   *
   * @default `true`, which means a `404 Not Found` error will be raised if there is no response.
   */
  readonly defaultHandler?: RequestHandler<TMeans> | boolean;

  /**
   * Error processing handler.
   *
   * This handler will be called once request processing error occurred. Such handler would receive
   * a {@link ErrorMeans error processing means} along with {@link HttpMeans HTTP processing ones}.
   *
   * When set to `false` the request processing errors will be logged, but otherwise ignored.
   *
   * @default `true`, which means the request processing error page will be rendered by {@link renderHttpError}
   * handler.
   */
  readonly errorHandler?: RequestHandler<TMeans & ErrorMeans> | boolean;

}

export namespace HttpConfig {

  /**
   * HTTP processing configuration for extended requests.
   *
   * @typeParam TExt  Request processing means extension type.
   */
  export interface Extended<TExt, TMeans extends HttpMeans = HttpMeans> extends HttpConfig<TMeans & TExt> {

    /**
     * Creates actual HTTP request handler.
     *
     * This can be used e.g. to set up additional request processing capabilities, such as {@link Logging}.
     *
     * @param handler  HTTP request handler.
     *
     * @returns HTTP request handler to use instead.
     */
    handleBy(handler: RequestHandler<TMeans & TExt>): RequestHandler<TMeans>;

  }

}

/**
 * @internal
 */
interface BaseHttpConfig<TMeans extends HttpMeans = HttpMeans> extends HttpConfig<TMeans> {

  handleBy?: undefined;

}

/**
 * @internal
 */
type AnyHttpConfig<TExt, TRequest extends IncomingMessage, TResponse extends ServerResponse> =
    | BaseHttpConfig<HttpMeans<TRequest, TResponse>>
    | HttpConfig.Extended<TExt, HttpMeans<TRequest, TResponse>>;

/**
 * Creates Node.js HTTP request listener that processes requests by extended HTTP request processing handler.
 *
 * @typeParam TRequest  A type of supported HTTP request.
 * @typeParam TResponse  A type of supported HTTP response.
 * @typeParam TExt  Request processing means extension type.
 * @param config  HTTP processing configuration.
 * @param handler  HTTP request processing handler to delegate to.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see requestHandler
 */
export function httpListener<
    TExt,
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    >(
    config: HttpConfig.Extended<TExt, HttpMeans<TRequest, TResponse>>,
    handler: RequestHandler<HttpMeans<TRequest, TResponse> & TExt>,
): (this: void, req: TRequest, res: TResponse) => void;

/**
 * Creates Node.js HTTP request listener that processes requests by HTTP request processing handler.
 *
 * @typeParam TRequest  A type of supported HTTP request.
 * @typeParam TResponse  A type of supported HTTP response.
 * @param config  HTTP processing configuration.
 * @param handler  HTTP request processing handler to delegate to.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see requestHandler
 */
export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    config: HttpConfig<HttpMeans<TRequest, TResponse>>,
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): (this: void, req: TRequest, res: TResponse) => void;

/**
 * Creates Node.js HTTP request listener that processes requests by HTTP request processing handler according to
 * default configuration.
 *
 * @typeParam TRequest  A type of supported HTTP request.
 * @typeParam TResponse  A type of supported HTTP response.
 * @param handler  HTTP request processing handler to delegate to.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see requestHandler
 */
export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): (this: void, req: TRequest, res: TResponse) => void;

export function httpListener<
    TExt,
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    >(
    configOrHandler: AnyHttpConfig<TExt, TRequest, TResponse> | RequestHandler<HttpMeans<TRequest, TResponse>>,
    optionalHandler?: RequestHandler<HttpMeans<TRequest, TResponse>>,
): (this: void, req: TRequest, res: TResponse) => void {

  let config: AnyHttpConfig<TExt, TRequest, TResponse>;
  let handler: RequestHandler<HttpMeans<TRequest, TResponse>>;

  if (optionalHandler) {
    config = configOrHandler as AnyHttpConfig<TExt, TRequest, TResponse>;
    handler = optionalHandler;
  } else {
    config = {};
    handler = configOrHandler as RequestHandler<HttpMeans<TRequest, TResponse>>;
  }

  const fullHandler = fullHttpHandler(config, handler);
  const incomingHandler = incomingHttpHandler(
      config.handleBy
          ? config.handleBy(fullHandler)
          : fullHandler as RequestHandler<HttpMeans<TRequest, TResponse>>,
  );
  const processor = requestProcessor<IncomingHttpMeans<TRequest, TResponse>>({
    handler: incomingHandler,
    next(
        handler,
        context,
    ): Promise<boolean> {

      const { response } = context;

      return Promise.resolve(context)
          .then(handler)
          .then(() => response.writableEnded);
    },
  });

  return (request: TRequest, response: TResponse): void => {
    new Promise<boolean>((onResponse, onError) => {
      processor({
        request,
        response,
        onResponse,
        onError,
      }).then(
          onResponse,
          onError,
      );
    }).catch(error => {
      console.error(`[${request.method} ${request.url}]`, 'Unhandled error', error);
    });
  };
}

/**
 * @internal
 */
interface IncomingHttpMeans<TRequest extends IncomingMessage, TResponse extends ServerResponse> {
  readonly request: TRequest;
  readonly response: TResponse;
  onResponse(this: void): void;
  onError(this: void, error: any): void;
}

/**
 * @internal
 */
function incomingHttpHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): RequestHandler<IncomingHttpMeans<TRequest, TResponse>> {
  return ({
    request,
    response,
    next,
    onResponse,
    onError,
  }) => {
    response.once('error', onError);
    response.once('finish', onResponse);
    response.once('close', onResponse);

    const end = response.end.bind(response);

    // Finish request processing immediately after calling `response.end()`
    response.end = ((chunk: any, encoding: string, cb?: () => void) => {
      end(chunk, encoding, cb);
      onResponse();
    }) as typeof response['end'];

    const requestDefaults = lazyValue(() => HttpAddressRep.defaults(request));
    const requestURL = lazyValue(() => {

      const { host, proto } = requestDefaults();
      const { url = '' } = request;

      return new URL(url, `${proto}://${host}`);
    });

    return next(
        handler,
        {
          requestAddresses: {
            get ip() {
              return requestDefaults().for;
            },
            get url() {
              return requestURL();
            },
          },
        },
    );
  };
}

/**
 * @internal
 */
function fullHttpHandler<TExt, TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    config: AnyHttpConfig<TExt, TRequest, TResponse>,
    handler: RequestHandler<HttpMeans<TRequest, TResponse> & TExt>,
): RequestHandler<HttpMeans<TRequest, TResponse> & TExt> {

  const defaultHandler = defaultHttpHandler(config);

  return dispatchError(
      httpErrorHandler(config),
      ({ next }) => next(handler).then(ok => ok || next(defaultHandler)),
  );
}

/**
 * @internal
 */
function defaultHttpHandler<TExt, TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
    }: AnyHttpConfig<TExt, TRequest, TResponse>,
): RequestHandler<HttpMeans<TRequest, TResponse> & TExt> {
  return defaultHandler
      ? (defaultHandler !== true ? defaultHandler : () => Promise.reject(new HttpError(404)))
      : noop;
}

/**
 * @internal
 */
function httpErrorHandler<TExt, TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
      errorHandler = true,
    }: AnyHttpConfig<TExt, TRequest, TResponse>,
): RequestHandler<HttpMeans<TRequest, TResponse> & TExt & ErrorMeans> {
  if (!errorHandler) {
    return Logging.for(defaultHandler ? renderEmptyHttpError : logHttpError);
  }

  const onError = errorHandler === true ? renderHttpError : errorHandler;

  return Logging.for(context => {
    logHttpError(context);
    return (context as RequestContext<HttpMeans<TRequest, TResponse> & TExt & ErrorMeans>).next(onError);
  });
}

/**
 * @internal
 */
function logHttpError(
    { request, log, error }: RequestContext<HttpMeans & ErrorMeans & LoggerMeans>,
): void {

  const report: any[] = [`[${request.method} ${request.url}]`];

  if (error instanceof HttpError) {
    report.push(error.message);

    const { details, reason } = error;

    if (details) {
      report.push(details);
    }
    if (reason) {
      report.push(reason);
    }
  } else {
    report.push(error);
  }

  log.error(...report);
}

/**
 * @internal
 */
function renderEmptyHttpError(context: RequestContext<HttpMeans & ErrorMeans & LoggerMeans>): void {
  logHttpError(context);
  context.response.end();
}


