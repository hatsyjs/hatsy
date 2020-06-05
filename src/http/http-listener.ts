/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { HatsyContext } from '../context';
import { ErrorHandler, ErrorMatters } from '../errors';
import { hatsyHandler, HatsyHandler } from '../handler';
import { renderHTTPError } from './handlers';
import { HTTPError } from './http-error';
import { HTTPHandler } from './http-handler';
import { HTTPMatters } from './http-matters';

/**
 * HTTP processing configuration.
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
 */
export interface HTTPConfig<
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    > {

  /**
   * A {@link HTTPMatters.log logger} to use.
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
  defaultHandler?: HTTPHandler<TRequest, TResponse> | boolean;

  /**
   * Error processing handler.
   *
   * This handler will be called once request processing error occurred. Such handler would receive
   * a {@link ErrorMatters error processing matters} along with {@link HTTPMatters HTTP processing matter}.
   *
   * When set to `false` the request processing errors will be logged, but otherwise ignored.
   *
   * @default `true`, which means the request processing error page will be rendered by {@link renderHTTPError}
   * handler.
   */
  errorHandler?: ErrorHandler<HTTPMatters<TRequest, TResponse>> | boolean;

}

/**
 * Creates Node.js HTTP request listener by Hatsy HTTP handler(s).
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
 * @param handlers  Either single HTTP request handler or iterable of HTTP request handlers to delegate request
 * processing to.
 * @param config  HTTP processing configuration.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see {@link hatsyHandler}
 */
export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handlers: HTTPHandler<TRequest, TResponse> | Iterable<HTTPHandler<TRequest, TResponse>>,
    config: HTTPConfig<TRequest, TResponse> = {},
): (this: void, req: TRequest, res: TResponse) => void {

  const { log = console } = config;
  const handler = hatsyHandler(handlers);
  const defaultHandler = defaultHTTPHandler(config);
  const errorHandler = httpErrorHandler(config);

  const fullHandler: HTTPHandler<TRequest, TResponse> = async (
      { next }: HatsyContext<HTTPMatters<TRequest, TResponse>>,
  ): Promise<void> => {
    try {
      if (!await next(handler)) {
        await next(defaultHandler);
      }
    } catch (error) {
      await next(errorHandler, { error });
    }
  };

  return (request: TRequest, response: TResponse): void => {
    toHTTPContext({
      request,
      response,
      log,
    }).next(fullHandler).catch(
        error => log.error(`[${request.method} ${request.url}]`, 'Unhandled error', error),
    );
  };
}

/**
 * @internal
 */
function toHTTPContext<
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    TMatters extends HTTPMatters<TRequest, TResponse>,
>(
    matters: TMatters,
): HatsyContext<TMatters> {

  const context = matters as HatsyContext<TMatters>;

  context.next = async <TExt>(
      handler: HatsyHandler<TMatters & TExt>,
      extensions?: HatsyContext.Extensions<HTTPMatters<TRequest, TResponse>, TExt>,
  ): Promise<boolean> => {

    await handler(extensions
        ? toHTTPContext({ ...matters, ...extensions } as TMatters & TExt)
        : context as HatsyContext<TMatters & TExt>);

    return matters.response.writableEnded;
  };

  return context;
}

/**
 * @internal
 */
function defaultHTTPHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
    }: HTTPConfig<TRequest, TResponse>,
): HTTPHandler<TRequest, TResponse> {
  if (!defaultHandler) {
    return () => {/* no default handler */};
  }
  return defaultHandler !== true
      ? defaultHandler
      : () => Promise.reject(new HTTPError(404, 'Not Found'));
}

/**
 * @internal
 */
function httpErrorHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
      errorHandler = true,
    }: HTTPConfig<TRequest, TResponse>,
): ErrorHandler<HTTPMatters<TRequest, TResponse>> {
  if (!errorHandler) {
    return defaultHandler ? renderEmptyHTTPError : logHTTPError;
  }

  const onError = errorHandler === true ? renderHTTPError : errorHandler;

  return async context => {
    logHTTPError(context);
    await context.next(onError);
  };
}

/**
 * @internal
 */
function logHTTPError<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    { request, log, error }: HatsyContext<HTTPMatters<TRequest, TResponse> & ErrorMatters>,
): void {
  if (error instanceof HTTPError) {
    log.error(`[${request.method} ${request.url}]`, `ERROR ${error.message}`);
  } else {
    log.error(`[${request.method} ${request.url}]`, error);
  }
}

/**
 * @internal
 */
function renderEmptyHTTPError(context: HatsyContext<HTTPMatters & ErrorMatters>): void {
  logHTTPError(context);
  context.response.end();
}


