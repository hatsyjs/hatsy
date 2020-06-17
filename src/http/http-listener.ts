/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HttpAddressRep } from '@hatsy/http-header-value/node';
import { lazyValue, noop } from '@proc7ts/primitives';
import { IncomingMessage, ServerResponse } from 'http';
import { ErrorMeans, RequestContext, RequestHandler, requestProcessor } from '../core';
import { HttpError } from './http-error';
import { HttpMeans } from './http.means';
import { renderHttpError } from './render';

/**
 * HTTP processing configuration.
 *
 * @category HTTP
 * @typeparam TMeans  A type of supported HTTP request processing means.
 */
export interface HttpConfig<TMeans extends HttpMeans = HttpMeans> {

  /**
   * A {@link HttpMeans.log logger} to use.
   *
   * @default `console.log`
   */
  log?: Console;

  /**
   * Default HTTP request handler.
   *
   * This handler will be called after all other handlers when response is not generated.
   *
   * When set to `false` the default response won't be generated.
   *
   * @default `true`, which means a `404 Not Found` error will be raised if there is no response.
   */
  defaultHandler?: RequestHandler<TMeans> | boolean;

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
  errorHandler?: RequestHandler<TMeans & ErrorMeans> | boolean;

}

/**
 * Creates Node.js HTTP request listener that processes requests by HTTP request processing handler(s).
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
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
 * Creates Node.js HTTP request listener that processes requests by HTTP request processing handler(s) according to
 * default configuration.
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
 * @param handler  HTTP request processing handler to delegate to.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see requestHandler
 */
export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): (this: void, req: TRequest, res: TResponse) => void;

export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    configOrHandler: HttpConfig<HttpMeans<TRequest, TResponse>> | RequestHandler<HttpMeans<TRequest, TResponse>>,
    optionalHandler?: RequestHandler<HttpMeans<TRequest, TResponse>>,
): (this: void, req: TRequest, res: TResponse) => void {

  let config: HttpConfig<HttpMeans<TRequest, TResponse>>;
  let handler: RequestHandler<HttpMeans<TRequest, TResponse>>;

  if (optionalHandler) {
    config = configOrHandler as HttpConfig<HttpMeans<TRequest, TResponse>>;
    handler = optionalHandler;
  } else {
    config = {};
    handler = configOrHandler as RequestHandler<HttpMeans<TRequest, TResponse>>;
  }

  const { log = console } = config;
  const processor = requestProcessor<IncomingHttpMeans<TRequest, TResponse>>({
    handler: incomingHttpHandler(fullHttpHandler(config, handler)),
    async next(handler, context) {
      await handler(context);
      return context.response.writableEnded;
    },
  });

  return (request: TRequest, response: TResponse): void => {
    processor({ request, response, log })
        .catch(
            error => log.error(`[${request.method} ${request.url}]`, 'Unhandled error', error),
        );
  };
}

/**
 * @internal
 */
interface IncomingHttpMeans<TRequest extends IncomingMessage, TResponse extends ServerResponse> {
  readonly request: TRequest;
  readonly response: TResponse;
  readonly log: Console;
}

/**
 * @internal
 */
function incomingHttpHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): RequestHandler<IncomingHttpMeans<TRequest, TResponse>> {
  return async ({ request, next }) => {

    const requestDefaults = lazyValue(() => HttpAddressRep.defaults(request));
    const requestURL = lazyValue(() => {

      const { host, proto } = requestDefaults();
      const { url = '' } = request;

      return new URL(url, `${proto}://${host}`);
    });

    await next(
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
function fullHttpHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    config: HttpConfig<HttpMeans<TRequest, TResponse>>,
    handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
):
    RequestHandler<HttpMeans<TRequest, TResponse>> {
  const defaultHandler = defaultHttpHandler(config);
  const errorHandler = httpErrorHandler(config);

  return async (
      { next }: RequestContext<HttpMeans<TRequest, TResponse>>,
  ): Promise<void> => {
    try {
      if (!await next(handler)) {
        await next(defaultHandler);
      }
    } catch (error) {
      await next(errorHandler, { error });
    }
  };
}

/**
 * @internal
 */
function defaultHttpHandler<TMeans extends HttpMeans>(
    {
      defaultHandler = true,
    }: HttpConfig<TMeans>,
): RequestHandler<TMeans> {
  if (!defaultHandler) {
    return noop;
  }
  return defaultHandler !== true
      ? defaultHandler
      : () => Promise.reject(new HttpError(404, 'Not Found'));
}

/**
 * @internal
 */
function httpErrorHandler<TMeans extends HttpMeans>(
    {
      defaultHandler = true,
      errorHandler = true,
    }: HttpConfig<TMeans>,
): RequestHandler<TMeans & ErrorMeans> {
  if (!errorHandler) {
    return defaultHandler ? renderEmptyHttpError : logHttpError;
  }

  const onError = errorHandler === true ? renderHttpError : errorHandler;

  return async context => {
    logHttpError(context);
    await context.next(onError);
  };
}

/**
 * @internal
 */
function logHttpError(
    { request, log, error }: RequestContext<HttpMeans & ErrorMeans>,
): void {
  if (error instanceof HttpError) {
    log.error(`[${request.method} ${request.url}]`, `ERROR ${error.message}`);
  } else {
    log.error(`[${request.method} ${request.url}]`, error);
  }
}

/**
 * @internal
 */
function renderEmptyHttpError(context: RequestContext<HttpMeans & ErrorMeans>): void {
  logHttpError(context);
  context.response.end();
}


