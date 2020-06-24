/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import { RequestContext } from './request-context';
import { RequestHandler, RequestHandlerMethod } from './request-handler';
import { RequestModification } from './request-modification';
import { isRequestModifier, RequestModifier, RequestModifier__symbol, RequestModifierRef } from './request-modifier';

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
      modification?: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
  ): Promise<boolean> {

    let context: RequestContext<TMeans & TExt>;

    if (modification) {

      const nextAgent = await ModifiedRequestProcessorAgent.create<TBase, TMeans, TExt>(this, modification);

      context = nextAgent.context;
    } else {
      context = this.context as RequestContext<TMeans & TExt>;
    }

    return this.config.next(handler, context);
  }

  abstract modify<TExt>(
      this: void,
      modification: RequestModification<TMeans, TExt>,
  ): Promise<RequestModification<TMeans, TExt>>;

  abstract modifiedBy<TInput, TExt>(
      this: void,
      ref: RequestModifierRef<TInput, TExt>,
  ): RequestContext<TMeans & TInput & TExt> | undefined;

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
      modifiedBy: this.modifiedBy,
    };
  }

  modifiedBy(): undefined {
    return;
  }

  modify<TExt>(
      this: void,
      modification: RequestModification<TMeans, TExt>,
  ): Promise<RequestModification<TMeans, TExt>> {
    return Promise.resolve(modification);
  }

}

/**
 * @internal
 */
class ModifiedRequestProcessorAgent<TBase, TMeans extends TBase, TExt>
    extends RequestProcessorAgent<TBase, TMeans & TExt> {

  static async create<TBase, TMeans extends TBase, TExt>(
      prev: RequestProcessorAgent<TBase, TMeans>,
      modification: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
  ): Promise<ModifiedRequestProcessorAgent<TBase, TMeans, TExt>> {

    let result: ModifiedRequestProcessorAgent<TBase, TMeans, TExt>;
    let modify = prev.modify as <TNext>(
        this: void,
        modification: RequestModification<TMeans & TExt, TNext>,
    ) => Promise<RequestModification<TMeans & TExt, TNext>>;
    let modifiedBy: <TModifierInput, TModifierExt>(
        this: void,
        ref: RequestModifierRef<TModifierInput, TModifierExt>,
    ) => RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;

    let modPromise: Promise<RequestModification<TMeans, TExt>>;

    if (isRequestModifier(modification)) {

      const modifier = modification;

      modPromise = Promise.resolve(modifier.modification(prev.context)).then(mod => prev.modify(mod));

      if (modifier.modifyNext) {
        modify = async <TNext>(mod: RequestModification<TMeans & TExt, TNext>) => prev.modify(
            modifier.modifyNext!(result.context, mod) as RequestModification<TMeans, TNext>,
        ) as Promise<RequestModification<TMeans & TExt, TNext>>;
      }

      modifiedBy = <TModifierInput, TModifierExt>(
          ref: RequestModifierRef<TModifierInput, TModifierExt>,
      ) => (modifier[RequestModifier__symbol] === ref[RequestModifier__symbol]
              ? result.context
              : prev.modifiedBy(ref)
      ) as RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;

    } else {
      modPromise = prev.modify(modification);
      modifiedBy = prev.modifiedBy as <TModifierInput, TModifierExt>(
          this: void,
          ref: RequestModifierRef<TModifierInput, TModifierExt>,
      ) => RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined;
    }

    return result = new ModifiedRequestProcessorAgent(prev, await modPromise, modify, modifiedBy);
  }

  readonly context: RequestContext<TMeans & TExt>;

  private constructor(
      prev: RequestProcessorAgent<TBase, TMeans>,
      modification: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
      readonly modify: <TNext>(
          this: void,
          modification: RequestModification<TMeans & TExt, TNext>,
      ) => Promise<RequestModification<TMeans & TExt, TNext>>,
      readonly modifiedBy: <TModifierInput, TModifierExt>(
          this: void,
          ref: RequestModifierRef<TModifierInput, TModifierExt>,
      ) => RequestContext<TMeans & TExt & TModifierInput & TModifierExt> | undefined,
  ) {
    super(prev.config);
    this.modify = modify;
    this.context = {
      ...prev.context,
      ...modification,
      next: this.next.bind(this),
      modifiedBy: this.modifiedBy,
    } as RequestContext<TMeans & TExt>;
  }

}
