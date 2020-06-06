/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { ErrorHandler, ErrorMatters } from '../errors';
import { RequestContext } from '../request-context';
import { requestHandler, RequestHandler } from '../request-handler';
import { renderHttpError } from './handlers';
import { HttpError } from './http-error';
import { HttpHandler } from './http-handler';
import { HttpMatters } from './http-matters';

/**
 * HTTP processing configuration.
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
 */
export interface HttpConfig<
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    > {

  /**
   * A {@link HttpMatters.log logger} to use.
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
  defaultHandler?: HttpHandler<TRequest, TResponse> | boolean;

  /**
   * Error processing handler.
   *
   * This handler will be called once request processing error occurred. Such handler would receive
   * a {@link ErrorMatters error processing matters} along with {@link HttpMatters HTTP processing matter}.
   *
   * When set to `false` the request processing errors will be logged, but otherwise ignored.
   *
   * @default `true`, which means the request processing error page will be rendered by {@link renderHttpError}
   * handler.
   */
  errorHandler?: ErrorHandler<HttpMatters<TRequest, TResponse>> | boolean;

}

/**
 * Creates Node.js HTTP request listener by processing requests by {@link HttpHandler HTTP handler(s)}.
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
    handlers: HttpHandler<TRequest, TResponse> | Iterable<HttpHandler<TRequest, TResponse>>,
    config: HttpConfig<TRequest, TResponse> = {},
): (this: void, req: TRequest, res: TResponse) => void {

  const { log = console } = config;
  const handler = requestHandler(handlers);
  const defaultHandler = defaultHttpHandler(config);
  const errorHandler = httpErrorHandler(config);

  const fullHandler: HttpHandler<TRequest, TResponse> = async (
      { next }: RequestContext<HttpMatters<TRequest, TResponse>>,
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
    toHttpContext({
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
function toHttpContext<
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    TMatters extends HttpMatters<TRequest, TResponse>,
>(
    matters: TMatters,
): RequestContext<TMatters> {

  const context = matters as RequestContext<TMatters>;

  context.next = async <TExt>(
      handler: RequestHandler<TMatters & TExt>,
      extensions?: RequestContext.Extensions<HttpMatters<TRequest, TResponse>, TExt>,
  ): Promise<boolean> => {

    await handler(extensions
        ? toHttpContext({ ...matters, ...extensions } as TMatters & TExt)
        : context as RequestContext<TMatters & TExt>);

    return matters.response.writableEnded;
  };

  return context;
}

/**
 * @internal
 */
function defaultHttpHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
    }: HttpConfig<TRequest, TResponse>,
): HttpHandler<TRequest, TResponse> {
  if (!defaultHandler) {
    return () => {/* no default handler */};
  }
  return defaultHandler !== true
      ? defaultHandler
      : () => Promise.reject(new HttpError(404, 'Not Found'));
}

/**
 * @internal
 */
function httpErrorHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    {
      defaultHandler = true,
      errorHandler = true,
    }: HttpConfig<TRequest, TResponse>,
): ErrorHandler<HttpMatters<TRequest, TResponse>> {
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
function logHttpError<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    { request, log, error }: RequestContext<HttpMatters<TRequest, TResponse> & ErrorMatters>,
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
function renderEmptyHttpError(context: RequestContext<HttpMatters & ErrorMatters>): void {
  logHttpError(context);
  context.response.end();
}


