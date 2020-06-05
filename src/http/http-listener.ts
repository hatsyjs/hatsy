/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, RequestListener, ServerResponse } from 'http';
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
 */
export interface HTTPConfig {

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
  defaultHandler?: HTTPHandler | boolean;

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
  errorHandler?: ErrorHandler<HTTPMatters> | boolean;

}

/**
 * Creates Node.js HTTP request listener by Hatsy HTTP handler(s).
 *
 * @category HTTP
 * @param handlers  Either single HTTP request handler or iterable of HTTP request handlers to delegate request
 * processing to.
 * @param config  HTTP processing configuration.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see {@link hatsyHandler}
 */
export function httpListener(
    handlers: HTTPHandler | Iterable<HTTPHandler>,
    config: HTTPConfig = {},
): RequestListener {

  const { log = console } = config;
  const handler = hatsyHandler(handlers);
  const defaultHandler = defaultHTTPHandler(config);
  const errorHandler = httpErrorHandler(config);

  const fullHandler: HTTPHandler = async ({ next }: HatsyContext<HTTPMatters>): Promise<void> => {
    try {
      if (!await next(handler)) {
        await next(defaultHandler);
      }
    } catch (error) {
      await next(errorHandler, { error });
    }
  };

  return (request: IncomingMessage, response: ServerResponse): void => {
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
function toHTTPContext<TMatters extends HTTPMatters>(draft: Omit<TMatters, 'next'>): HatsyContext<TMatters> {

  const context = draft as HatsyContext<TMatters>;

  context.next = async <TExt>(
      handler: HatsyHandler<TMatters & TExt>,
      extensions?: HatsyContext.Extensions<TMatters, TExt>,
  ): Promise<boolean> => {

    await handler(extensions
        ? toHTTPContext<TMatters & TExt>({ ...draft, ...extensions } as TMatters & TExt)
        : context as HatsyContext<TMatters & TExt>);

    return draft.response.writableEnded;
  };

  return context;
}

/**
 * @internal
 */
function defaultHTTPHandler({ defaultHandler = true }: HTTPConfig): HTTPHandler {
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
function httpErrorHandler(
    {
      defaultHandler = true,
      errorHandler = true,
    }: HTTPConfig,
): ErrorHandler<HTTPMatters> {
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
function logHTTPError({ request, log, error }: HatsyContext<HTTPMatters & ErrorMatters>): void {
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


