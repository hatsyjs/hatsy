/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, RequestListener, ServerResponse } from 'http';
import { hatsyHandler, HatsyHandler, HatsyRequestContext } from './handler';
import { HatsyErrorContext, hatsyRenderError } from './handlers';
import { HatsyHttpError } from './http-error';

/**
 * Hatsy configuration.
 */
export interface HatsyConfig {

  /**
   * A {@link HatsyRequestContext.log logger} to use.
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
  defaultHandler?: HatsyHandler | boolean;

  /**
   * A handler of request processing error.
   *
   * This handler will be called once request processing error occurred. Such handler would receive
   * a {@link HatsyErrorContext error context} instead of original one.
   *
   * When set to `false` the request processing errors will be logged, but otherwise ignored.
   *
   * @default `true`, which means the request processing error page will be rendered by {@link hatsyRenderError}
   * handler.
   */
  errorHandler?: HatsyHandler<HatsyErrorContext> | boolean;

}

/**
 * Creates Node.js HTTP request listener by Hatsy HTTP handler(s).
 *
 * @param handlers  Either single HTTP request handler or iterable of HTTP request handlers to delegate request
 * processing to.
 * @param config  Hatsy configuration.
 *
 * @returns HTTP request listener to pass to Node.js HTTP server.
 *
 * @see {@link hatsyHandler}
 */
export function hatsyListener(
    handlers: HatsyHandler | Iterable<HatsyHandler>,
    config: HatsyConfig = {},
): RequestListener {

  const { log = console } = config;
  const handler = hatsyHandler(handlers);
  const defaultHandler = hatsyDefaultHandler(config);
  const errorHandler = hatsyErrorHandler(config);

  const fullHandler: HatsyHandler = async ({ next }: HatsyRequestContext): Promise<void> => {
    try {
      if (!await next(handler)) {
        await next(defaultHandler);
      }
    } catch (error) {
      await next(errorHandler, { error });
    }
  };

  return (request: IncomingMessage, response: ServerResponse): void => {
    toHatsyRequestContext({
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
function toHatsyRequestContext<TCtx extends HatsyRequestContext>(draft: Omit<TCtx, 'next'>): TCtx {

  const context = draft as TCtx;

  context.next = async <TExt>(
      handler: HatsyHandler<TCtx & TExt>,
      extensions?: HatsyRequestContext.Extensions<TCtx, TExt>,
  ): Promise<boolean> => {

    await handler(extensions
        ? toHatsyRequestContext<TCtx & TExt & HatsyRequestContext>({ ...draft, ...extensions } as TCtx & TExt)
        : context as TCtx & TExt);

    return draft.response.writableEnded;
  };

  return context;
}

/**
 * @internal
 */
function hatsyDefaultHandler({ defaultHandler = true }: HatsyConfig): HatsyHandler {
  if (!defaultHandler) {
    return () => {/* no default handler */};
  }
  return defaultHandler !== true
      ? defaultHandler
      : () => Promise.reject(new HatsyHttpError(404, 'Not Found'));
}

/**
 * @internal
 */
function hatsyErrorHandler({
  defaultHandler = true,
  errorHandler = true,
}: HatsyConfig): HatsyHandler<HatsyErrorContext> {
  if (!errorHandler) {
    return defaultHandler ? hatsyRenderEmptyError : hatsyLogError;
  }

  const onError = errorHandler === true ? hatsyRenderError : errorHandler;

  return async context => {
    hatsyLogError(context);
    await context.next(onError);
  };
}

/**
 * @internal
 */
function hatsyLogError({ request, log, error }: HatsyErrorContext): void {
  if (error instanceof HatsyHttpError) {
    log.error(`[${request.method} ${request.url}]`, `ERROR ${error.message}`);
  } else {
    log.error(`[${request.method} ${request.url}]`, error);
  }
}

/**
 * @internal
 */
function hatsyRenderEmptyError(context: HatsyErrorContext): void {
  hatsyLogError(context);
  context.response.end();
}


