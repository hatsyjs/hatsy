import type { RequestContext } from './request-context.js';
import type { RequestHandler, RequestHandlerMethod } from './request-handler.js';
import type { RequestModification } from './request-modification.js';

/**
 * Generic request processor.
 *
 * Can be constructed by {@link requestProcessor} function.
 *
 * @typeParam TMeans - A type of initial request processing means.
 */
export type RequestProcessor<TMeans> =
  /**
   * @param means - Initial request processing means.
   *
   * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
   * or to `false` otherwise.
   */
  (this: void, means: TMeans) => Promise<boolean>;

export namespace RequestProcessor {
  /**
   * Request processor configuration.
   *
   * @typeParam TMeans - A type of initial request processing means.
   */
  export interface Config<TMeans> {
    /**
     * Initial request processing handler.
     *
     * This processor is invoked immediately on request processor call.
     */
    readonly handler: RequestHandlerMethod<this, TMeans>;

    /**
     * Calls the next request processing handler.
     *
     * This method is called when {@link RequestContext.Agent.next delegating to request handler}. The value returned
     * is used as processing result.
     *
     * @param handler - Request processing handler.
     * @param context - Request processing context.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt extends object>(
      handler: RequestHandler<TMeans & TExt>,
      context: RequestContext<TMeans & TExt>,
    ): Promise<boolean>;
  }
}

/**
 * Builds a request processor.
 *
 * @typeParam TMeans - A type of initial request processing means.
 * @param config - Request processor configuration.
 *
 * @returns New request processor.
 */
export function requestProcessor<TMeans>(
  config: RequestProcessor.Config<TMeans>,
): RequestProcessor<TMeans> {
  const handler = config.handler.bind(config);

  return means => {
    const context = { ...means } as RequestContext<TMeans>;

    context.next = nextHandlerCaller(config, context) as RequestContext<TMeans>['next'];

    return config.next(handler, context);
  };
}

/**
 * @internal
 */
function nextHandlerCaller<TBase, TMeans extends TBase, TExt extends object>(
  config: RequestProcessor.Config<TBase>,
  means: TMeans,
): (
  handler: RequestHandler<TMeans & TExt>,
  modification?: RequestModification<TMeans, TExt>,
) => Promise<boolean> {
  return async (
    handler: RequestHandler<TMeans & TExt>,
    modification?: RequestModification<TMeans, TExt>,
  ): Promise<boolean> => {
    let context: RequestContext<TMeans & TExt>;

    if (modification) {
      context = { ...means, ...modification } as RequestContext<TMeans & TExt>;
      context.next = nextHandlerCaller(config, context as TMeans & TExt);
    } else {
      context = means as RequestContext<TMeans & TExt>;
    }

    return config.next(handler, context);
  };
}
