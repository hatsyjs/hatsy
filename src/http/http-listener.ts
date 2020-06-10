/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { ErrorMeans } from '../error-means';
import { RequestContext, RequestModification } from '../request-context';
import { requestHandler, RequestHandler } from '../request-handler';
import { isRequestModifier, RequestModifier, RequestModifier__symbol } from '../request-modifier';
import { renderHttpError } from './handlers';
import { HttpError } from './http-error';
import { HttpMeans } from './http-means';

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
 * Creates Node.js HTTP request listener by processing requests by HTTP request processing handler(s).
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
 * @see requestHandler
 */
export function httpListener<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
    handlers: RequestHandler<HttpMeans<TRequest, TResponse>> | Iterable<RequestHandler<HttpMeans<TRequest, TResponse>>>,
    config: HttpConfig<HttpMeans<TRequest, TResponse>> = {},
): (this: void, req: TRequest, res: TResponse) => void {

  const { log = console } = config;
  const handler = requestHandler(handlers);
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
    if (!modification) {
      await handler(this.context as RequestContext<TMeans & TExt>);
    } else {
      await handler(new ModifiedHttpRequestAgent<TRequest, TResponse, TMeans, TExt>(this, modification).context);
    }

    return this.context.response.writableEnded;
  }

  abstract modify<TExt>(
      this: void,
      modification: RequestModification<TMeans, TExt>,
  ): RequestModification<TMeans, TExt>;

  abstract modifiedBy(this: void, id: any): boolean;

}

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

  modifiedBy(this: void): boolean {
    return false;
  }

  modify<TExt>(
      this: void,
      modification: RequestModification<HttpMeans<TRequest, TResponse>, TExt>,
  ): RequestModification<HttpMeans<TRequest, TResponse>, TExt> {
    return modification;
  }

}

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

  readonly modifiedBy: (this: void, id: any) => boolean;

  constructor(
      prev: HttpRequestAgent<TRequest, TResponse, TMeans>,
      modification?: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
  ) {
    super();

    let modify = prev.modify as <TNext>(
        this: void,
        modification: RequestModification<TMeans & TExt, TNext>,
    ) => RequestModification<TMeans & TExt, TNext>;

    if (modification && isRequestModifier(modification)) {

      const modifier = modification;

      modification = prev.modify(modifier.modification(prev.context));

      if (modifier.modify) {
        modify = <TNext>(mod: RequestModification<TMeans & TExt, TNext>) => prev.modify(
            modifier.modify!(this.context, mod) as RequestModification<TMeans, TNext>,
        ) as RequestModification<TMeans & TExt, TNext>;
      }

      this.modifiedBy = id => modifier[RequestModifier__symbol] === id || prev.modifiedBy(id);

    } else {
      if (!modification) {
        modification = {} as RequestModification<TMeans, TExt>;
      }
      this.modifiedBy = prev.modifiedBy;
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


