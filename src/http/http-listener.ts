import { consoleLogger } from '@proc7ts/logger';
import { lazyValue, noop } from '@proc7ts/primitives';
import { HttpAddressRep } from 'http-header-value/node.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatchError } from '../core/dispatch-error.js';
import { ErrorMeans } from '../core/error.means.js';
import { LoggerMeans } from '../core/logging/logger.means.js';
import { Logging } from '../core/logging/logging.capability.js';
import { RequestContext } from '../core/request-context.js';
import { RequestHandler } from '../core/request-handler.js';
import { requestProcessor } from '../core/request-processor.js';
import { HttpConfig } from './http-config.js';
import { HttpError } from './http-error.js';
import { AnyHttpConfig } from './http-listener.impl.js';
import { HttpMeans } from './http.means.js';
import { renderHttpError } from './render/render-http-error.handler.js';

/**
 * Creates Node.js HTTP request listener that processes requests by extended HTTP request processing handler.
 *
 * @typeParam TRequest - A type of supported HTTP request.
 * @typeParam TResponse - A type of supported HTTP response.
 * @typeParam TExt - Request processing means extension type.
 * @param config - HTTP processing configuration.
 * @param handler - HTTP request processing handler to delegate to.
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
 * @typeParam TRequest - A type of supported HTTP request.
 * @typeParam TResponse - A type of supported HTTP response.
 * @param config - HTTP processing configuration.
 * @param handler - HTTP request processing handler to delegate to.
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
 * @typeParam TRequest - A type of supported HTTP request.
 * @typeParam TResponse - A type of supported HTTP response.
 * @param handler - HTTP request processing handler to delegate to.
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
  configOrHandler:
    | AnyHttpConfig<TExt, TRequest, TResponse>
    | RequestHandler<HttpMeans<TRequest, TResponse>>,
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
      : (fullHandler as RequestHandler<HttpMeans<TRequest, TResponse>>),
  );
  const processor = requestProcessor<IncomingHttpMeans<TRequest, TResponse>>({
    handler: incomingHandler,
    next(handler, context): Promise<boolean> {
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
      }).then(onResponse, onError);
    }).catch(error => {
      consoleLogger.error(`[${request.method} ${request.url}]`, 'Unhandled error', error);
    });
  };
}

/**
 * @internal
 */
interface IncomingHttpMeans<TRequest extends IncomingMessage, TResponse extends ServerResponse> {
  readonly request: TRequest;
  readonly response: TResponse;
  onResponse(this: void, value: boolean): void;
  onError(this: void, error: unknown): void;
}

/**
 * @internal
 */
function incomingHttpHandler<TRequest extends IncomingMessage, TResponse extends ServerResponse>(
  handler: RequestHandler<HttpMeans<TRequest, TResponse>>,
): RequestHandler<IncomingHttpMeans<TRequest, TResponse>> {
  return ({ request, response, next, onResponse, onError }) => {
    response.once('error', onError);
    response.once('finish', onResponse);
    response.once('close', onResponse);

    const end = response.end.bind(response);

    // Finish request processing immediately after calling `response.end()`
    (response as ServerResponse).end = ((
      chunk: unknown,
      encoding: BufferEncoding,
      cb?: () => void,
    ) => {
      end(chunk, encoding, cb);
      onResponse(true);
    }) as ServerResponse['end'];

    const requestDefaults = lazyValue(() => HttpAddressRep.defaults(request));
    const requestURL = lazyValue(() => {
      const { host, proto } = requestDefaults();
      const { url = '' } = request;

      return new URL(url, `${proto}://${host}`);
    });

    return next(handler, {
      requestAddresses: {
        get ip() {
          return requestDefaults().for;
        },
        get url() {
          return requestURL();
        },
      },
    });
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

  return dispatchError(httpErrorHandler(config), ({ next }) =>
    next(handler).then(ok => ok || next(defaultHandler)),
  );
}

/**
 * @internal
 */
function defaultHttpHandler<
  TExt,
  TRequest extends IncomingMessage,
  TResponse extends ServerResponse,
>({
  defaultHandler = true,
}: AnyHttpConfig<TExt, TRequest, TResponse>): RequestHandler<
  HttpMeans<TRequest, TResponse> & TExt
> {
  return defaultHandler
    ? defaultHandler !== true
      ? defaultHandler
      : () => Promise.reject(new HttpError(404))
    : noop;
}

/**
 * @internal
 */
function httpErrorHandler<
  TExt,
  TRequest extends IncomingMessage,
  TResponse extends ServerResponse,
>({
  logError = true,
  defaultHandler = true,
  errorHandler = true,
}: AnyHttpConfig<TExt, TRequest, TResponse>): RequestHandler<
  HttpMeans<TRequest, TResponse> & TExt & ErrorMeans
> {
  const onError = errorHandler
    ? errorHandler === true
      ? renderHttpError
      : errorHandler
    : defaultHandler
      ? renderEmptyHttpResponse
      : noop;

  if (!logError) {
    return onError;
  }

  return Logging.for(context => {
    logHttpError(context);

    return (context as RequestContext<HttpMeans<TRequest, TResponse> & TExt & ErrorMeans>).next(
      onError,
    );
  });
}

/**
 * @internal
 */
function logHttpError({ log, error }: RequestContext<HttpMeans & ErrorMeans & LoggerMeans>): void {
  log.error(error);
}

/**
 * @internal
 */
function renderEmptyHttpResponse(context: RequestContext<HttpMeans & ErrorMeans>): void {
  context.response.end();
}
