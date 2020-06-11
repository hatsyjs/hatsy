/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import {
  ErrorMeans,
  isRequestModifier,
  RequestContext,
  RequestHandler,
  RequestModification,
  RequestModifier,
  RequestModifier__symbol,
  RequestModifierRef,
} from '../core';
import { HttpError } from './http-error';
import { HttpMeans } from './http-means';
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
  const defaultHandler = defaultHttpHandler(config);
  const errorHandler = httpErrorHandler(config);

  const fullHandler: RequestHandler<HttpMeans<TRequest, TResponse>> = async (
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

  return (request: TRequest, response: TResponse): void => {
    new RootHttpRequestAgent({ request, response, log })
        .next(fullHandler)
        .catch(
            error => log.error(`[${request.method} ${request.url}]`, 'Unhandled error', error),
        );
  };
}

/**
 * @internal
 */
abstract class HttpRequestAgent<
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    TMeans extends HttpMeans<TRequest, TResponse> = HttpMeans<TRequest, TResponse>,
    > {

  abstract readonly context: RequestContext<TMeans>;

  async next<TExt>(
      handler: RequestHandler<TMeans & TExt>,
      modification?: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
  ): Promise<boolean> {
    if (modification) {
      await handler(new ModifiedHttpRequestAgent<TRequest, TResponse, TMeans, TExt>(this, modification).context);
    } else {
      await handler(this.context as RequestContext<TMeans & TExt>);
    }

    return this.context.response.writableEnded;
  }

  abstract modify<TExt>(
      this: void,
      modification: RequestModification<TMeans, TExt>,
  ): RequestModification<TMeans, TExt>;

  abstract modifiedBy<TInput, TExt>(
      this: void,
      ref: RequestModifierRef<TInput, TExt>,
  ): RequestContext<TMeans & TInput & TExt> | undefined;

}

/**
 * @internal
 */
class RootHttpRequestAgent<
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    > extends HttpRequestAgent<TRequest, TResponse> {

  readonly context: RequestContext<HttpMeans<TRequest, TResponse>>;

  constructor(means: HttpMeans<TRequest, TResponse>) {
    super();
    this.context = {
      ...means,
      next: this.next.bind(this),
      modifiedBy: this.modifiedBy,
    };
  }

  modifiedBy(): undefined {
    return;
  }

  modify<TExt>(
      this: void,
      modification: RequestModification<HttpMeans<TRequest, TResponse>, TExt>,
  ): RequestModification<HttpMeans<TRequest, TResponse>, TExt> {
    return modification;
  }

}

/**
 * @internal
 */
class ModifiedHttpRequestAgent<
    TRequest extends IncomingMessage,
    TResponse extends ServerResponse,
    TMeans extends HttpMeans<TRequest, TResponse>,
    TExt,
    > extends HttpRequestAgent<TRequest, TResponse, TMeans & TExt> {

  readonly context: RequestContext<TMeans & TExt>;

  readonly modify: <TNext>(
      this: void,
      modification: RequestModification<TMeans & TExt, TNext>,
  ) => RequestModification<TMeans & TExt, TNext>;

  readonly modifiedBy: <TModifierInput, TModifierExt>(
      this: void,
      ref: RequestModifierRef<TModifierInput, TModifierExt>,
  ) => RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;

  constructor(
      prev: HttpRequestAgent<TRequest, TResponse, TMeans>,
      modification: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
  ) {
    super();

    let modify = prev.modify as <TNext>(
        this: void,
        modification: RequestModification<TMeans & TExt, TNext>,
    ) => RequestModification<TMeans & TExt, TNext>;

    if (isRequestModifier(modification)) {

      const modifier = modification;

      modification = prev.modify(modifier.modification(prev.context));

      if (modifier.modify) {
        modify = <TNext>(mod: RequestModification<TMeans & TExt, TNext>) => prev.modify(
            modifier.modify!(this.context, mod) as RequestModification<TMeans, TNext>,
        ) as RequestModification<TMeans & TExt, TNext>;
      }

      this.modifiedBy = <TModifierInput, TModifierExt>(
          ref: RequestModifierRef<TModifierInput, TModifierExt>,
      ) => (modifier[RequestModifier__symbol] === ref[RequestModifier__symbol]
          ? this.context
          : prev.modifiedBy(ref)
      ) as RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;

    } else {
      modification = prev.modify(modification);
      this.modifiedBy = prev.modifiedBy as <TModifierInput, TModifierExt>(
          this: void,
          ref: RequestModifierRef<TModifierInput, TModifierExt>,
      ) => RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;
    }

    this.modify = modify;
    this.context = {
      ...prev.context,
      ...modification,
      next: this.next.bind(this),
      modifiedBy: this.modifiedBy,
    } as RequestContext<TMeans & TExt>;
  }

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
    return () => {/* no default handler */};
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


