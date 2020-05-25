/**
 * @packageDocumentation
 * @module @proc7ts/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';

/**
 * HTTP request handler signature.
 *
 * HTTP request handler is called once per request. It accepts a {@link HatsyRequestContext request context} instance
 * used to respond or delegate to another handler.
 *
 * The handler may be asynchronous.
 *
 * @typeparam TCtx  A type of HTTP request processing context this handler expects.
 */
export type HatsyHandler<TCtx extends HatsyRequestContext = HatsyRequestContext> =
/**
 * @param context  Request context.
 *
 * @returns Either nothing if the handler completed its work synchronously, or a promise resolved when the handler
 * completed its work asynchronously.
 */
    (
        this: void,
        context: TCtx,
    ) => PromiseLike<void> | void;

/**
 * A context of HTTP request processing.
 *
 * A context instance is created per request and passed to {@link HatsyHandler handler}. The latter responds by
 * utilizing the passed context [[response]], or delegates to [[next]] handler.
 *
 * A context instance is immutable. It can be {@link HatsyRequestContext.Modifications modified} or even
 * {@link HatsyRequestContext.Extensions extended} when delegating request processing to the [[next]] handler
 * by creating another context based on original one.
 */
export interface HatsyRequestContext {

  /**
   * HTTP request.
   */
  readonly request: IncomingMessage;

  /**
   * HTTP response.
   */
  readonly response: ServerResponse;

  /**
   * A logger to use.
   */
  readonly log: Console;

  /**
   * Delegates request processing to next `handler` and optionally modifies this processing context by creating
   * a new one with the given `modifications` applied. The rest of the properties remain unchanged.
   *
   * @param handler  Target handler to delegate request processing to.
   * @param modifications  Request processing context modifications. `this` context will be passed to the next `handler`
   * when omitted
   *
   * @returns A promise resolved when request processing completes. Resolves to `true` if response is written,
   * or to `false` otherwise.
   */
  next(
      this: void,
      handler: HatsyHandler<this>,
      modifications?: HatsyRequestContext.Modifications<this>,
  ): Promise<boolean>;

  /**
   * Delegates request processing to next `handler` and extends this context by creating a new one with the given
   * `extensions` applied. The rest of the properties remain unchanged.
   *
   * @param handler  Target handler to delegate request processing to.
   * @param extensions  Request processing context extensions.
   *
   * @returns A promise resolved when request processing completes. Resolves to `true` if response is written,
   * or to `false` otherwise.
   */
  next<TNextCtx extends this>(
      this: void,
      handler: HatsyHandler<TNextCtx>,
      extensions: HatsyRequestContext.Extensions<this, TNextCtx>,
  ): Promise<boolean>;

}

export namespace HatsyRequestContext {

  /**
   * Modifications to {@link HatsyRequestContext request processing context}.
   *
   * The properties listed here replace the original ones.
   *
   * @typeparam TCtx  A type of HTTP request processing context to modify.
   */
  export type Modifications<TCtx extends HatsyRequestContext> = Omit<Partial<TCtx>, 'next'>;

  /**
   * Extensions of {@link HatsyRequestContext request processing context}.
   *
   * The properties listed here either replace the original ones, or added to new context.
   *
   * @typeparam TCtx  A type of HTTP request processing context to extend.
   * @typeparam TNextCtx  A type of extended HTTP request processing context.
   */
  export type Extensions<TCtx extends HatsyRequestContext, TNextCtx extends TCtx> =
      & Modifications<TCtx>
      & Omit<TNextCtx, 'next' | keyof TCtx>;

}

/**
 * Builds HTTP request handler that handles the request by one of the given ones.
 *
 * It iterates over the given handlers in order and delegates the request processing to them. And stops when
 * either response is written, an error thrown, or there is no more handlers.
 *
 * @typeparam TCtx  A type of HTTP request processing context the `handlers` expect.
 * @param handlers  Either single HTTP request handler or iterable of HTTP request handlers to delegate request
 * processing to.
 *
 * @returns HTTP request handler.
 */
export function hatsyHandler<TCtx extends HatsyRequestContext>(
    handlers: HatsyHandler<TCtx> | Iterable<HatsyHandler<TCtx>>,
): HatsyHandler<TCtx> {
  if (typeof handlers === 'function') {
    return handlers;
  }
  return async (context: TCtx): Promise<void> => {
    for (const handler of handlers) {
      if (await context.next(handler)) {
        return;
      }
    }
    return;
  };
}
