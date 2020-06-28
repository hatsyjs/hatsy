/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import { RequestContext } from './request-context';
import { RequestHandler, RequestHandlerMethod } from './request-handler';
import { RequestModification } from './request-modification';

/**
 * Generic request processor.
 *
 * Can be constructed by {@link requestProcessor} function.
 *
 * @typeparam TMeans  A type of initial request processing means.
 */
export type RequestProcessor<TMeans> =
/**
 * @param means  Initial request processing means.
 *
 * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
 * or to `false` otherwise.
 */
    (this: void, means: TMeans) => Promise<boolean>;


export namespace RequestProcessor {

  /**
   * Request processor configuration.
   *
   * @typeparam TMeans  A type of initial request processing means.
   */
  export interface Config<TMeans> {

    /**
     * Initial request processing handler.
     *
     * This processor is invoked immediately on request processor call.
     */
    readonly handler: RequestHandlerMethod<this, TMeans>

    /**
     * Calls the next request processing handler.
     *
     * This method is called when {@link RequestContext.Agent.next delegating to request handler}. The value returned
     * is used as processing result.
     *
     * @param handler  Request processing handler.
     * @param context  Request processing context.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt>(
        handler: RequestHandler<TMeans & TExt>,
        context: RequestContext<TMeans & TExt>,
    ): Promise<boolean>;

  }

}

/**
 * Builds a request processor.
 *
 * @typeparam TMeans  A type of initial request processing means.
 * @param config  Request processor configuration.
 *
 * @returns New request processor.
 */
export function requestProcessor<TMeans>(
    config: RequestProcessor.Config<TMeans>,
): RequestProcessor<TMeans> {
  return means => new RootRequestProcessorAgent(config, means).next(context => config.handler(context));
}

/**
 * @internal
 */
abstract class RequestProcessorAgent<TBase, TMeans extends TBase> {

  abstract readonly context: RequestContext<TMeans>;

  protected constructor(readonly config: RequestProcessor.Config<TBase>) {
  }

  async next<TExt>(
      handler: RequestHandler<TMeans & TExt>,
      modification?: RequestModification<TMeans, TExt>,
  ): Promise<boolean> {

    let context: RequestContext<TMeans & TExt>;

    if (modification) {
      context = (await nextRequestProcessorAgent(this, modification)).context;
    } else {
      context = this.context as RequestContext<TMeans & TExt>;
    }

    return this.config.next(handler, context);
  }

  abstract modify<TExt>(
      this: void,
      context: RequestContext<TMeans>,
      modification: RequestModification<TMeans, TExt>,
  ): Promise<RequestModification<TMeans, TExt>>;

}

/**
 * @internal
 */
class RootRequestProcessorAgent<TMeans> extends RequestProcessorAgent<TMeans, TMeans> {

  readonly context: RequestContext<TMeans>;

  constructor(config: RequestProcessor.Config<TMeans>, means: TMeans) {
    super(config);
    this.context = {
      ...means,
      next: this.next.bind(this),
    };
  }

  modify<TExt>(
      this: void,
      _context: RequestContext<TMeans>,
      modification: RequestModification<TMeans, TExt>,
  ): Promise<RequestModification<TMeans, TExt>> {
    return Promise.resolve(modification);
  }

}

/**
 * @internal
 */
async function nextRequestProcessorAgent<TBase, TMeans extends TBase, TExt>(
    prev: RequestProcessorAgent<TBase, TMeans>,
    modification: RequestModification<TMeans, TExt>,
): Promise<RequestProcessorAgent<TBase, TMeans & TExt>> {
  return new ModificationRequestProcessorAgent<TBase, TMeans, TExt>(
      prev,
      await prev.modify(prev.context, modification),
  );
}

/**
 * @internal
 */
class ModificationRequestProcessorAgent<TBase, TMeans extends TBase, TExt>
    extends RequestProcessorAgent<TBase, TMeans & TExt> {

  readonly context: RequestContext<TMeans & TExt>;

  readonly modify: <TNext>(
      this: void,
      context: RequestContext<TMeans & TExt>,
      modification: RequestModification<TMeans & TExt, TNext>,
  ) => Promise<RequestModification<TMeans & TExt, TNext>>;

  constructor(
      prev: RequestProcessorAgent<TBase, TMeans>,
      modification: RequestModification<TMeans, TExt>,
  ) {
    super(prev.config);
    this.modify = prev.modify as this['modify'];
    this.context = {
      ...prev.context,
      ...modification,
      next: this.next.bind(this),
    } as RequestContext<TMeans & TExt>;
  }

}
