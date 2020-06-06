/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestHandler } from './request-handler';

/**
 * Request processing context.
 *
 * It is passed to {@link RequestHandler request processing handler}. It contains request processing matters the handler
 * needs. The latter can either respond, or delegate processing to {@link RequestContext.Agent.next next handler}.
 *
 * The context instance is immutable. The matters it contain can be {@link RequestContext.Modifications modified}
 * or even {@link RequestContext.Extensions extended} when delegating request processing to the
 * {@link RequestContext.Agent.next next handler} by creating another context based on original one.
 *
 * @category Core
 * @typeparam TMatters  Request processing matters of this context.
 */
export type RequestContext<TMatters> = TMatters & RequestContext.Agent<TMatters>;

export namespace RequestContext {

  /**
   * Modifications to {@link RequestContext request processing matters}.
   *
   * The properties listed here replace the original ones.
   *
   * @typeparam TMatters  A type of request processing matters to modify.
   */
  export type Modifications<TMatters> = Partial<TMatters>;

  /**
   * Extensions of {@link RequestContext request processing matters}.
   *
   * The properties listed here either replace the original ones, or added to new context.
   *
   * @typeparam TMatters  A type of request processing matters to extend.
   * @typeparam TExt  A type of extension.
   */
  export type Extensions<TMatters, TExt> =
      & Modifications<TMatters>
      & Omit<TExt, keyof TMatters>;

  /**
   * Request processing agent interface.
   *
   * It is extended by {@link RequestContext request processing context} in order the {@link RequestHandler handlers}
   * to be able to {@link next delegate processing} to other handlers.
   *
   * @typeparam TMatters A type of request processing matters.
   */
  export interface Agent<TMatters> {

    /**
     * Delegates request processing to the next `handler` and optionally modifies processing matters by creating a new
     * context with the given `modifications` applied. The rest of the properties remain unchanged.
     *
     * @param handler  Target handler to delegate request processing to.
     * @param modifications  Request processing matters modifications. `this` context will be passed to the next
     * `handler` when omitted
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next(
        this: void,
        handler: RequestHandler<TMatters>,
        modifications?: RequestContext.Modifications<TMatters>,
    ): Promise<boolean>;

    /**
     * Delegates request processing to the next `handler` and extends processing matters by creating a new context with
     * the given `extensions` applied. The rest of the properties remain unchanged.
     *
     * @typeparam TExt  A type of request processing matters extension.
     * @param handler  Target handler accepting extended context to delegate request processing to.
     * @param extensions  Request processing matters extensions.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt>(
        this: void,
        handler: RequestHandler<TMatters & TExt>,
        extensions: RequestContext.Extensions<TMatters, TExt>,
    ): Promise<boolean>;

  }

}
