/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestHandler } from './request-handler';

/**
 * Request processing context.
 *
 * It is passed to {@link RequestHandler request processing handler}. It the necessary means. The handler can either
 * respond by these means, or delegate processing to the {@link RequestContext.Agent.next next handler}.
 *
 * The context instance is immutable. The means it contains can be {@link RequestModifications modified}
 * or even {@link RequestExtensions extended} when delegating request processing to the
 * {@link RequestContext.Agent.next next handler} by creating another context based on original one.
 *
 * @category Core
 * @typeparam TMeans  Request processing means of this context.
 */
export type RequestContext<TMeans> = TMeans & RequestContext.Agent<TMeans>;

/**
 * Modifications to {@link RequestContext request processing means}.
 *
 * The properties present here replace the original ones.
 *
 * @typeparam TMeans  A type of request processing means to modify.
 */
export type RequestModifications<TMeans> = Partial<TMeans>;

/**
 * Extensions of {@link RequestContext request processing means}.
 *
 * The properties present here either replace the original ones, or added to the new context.
 *
 * @typeparam TMeans  A type of request processing means to extend.
 * @typeparam TExt  A type of extension.
 */
export type RequestExtensions<TMeans, TExt> = RequestModifications<TMeans> & Omit<TExt, keyof TMeans>;

export namespace RequestContext {

  /**
   * Request processing agent interface.
   *
   * It is extended by {@link RequestContext request processing context} in order the {@link RequestHandler handlers}
   * to be able to {@link next delegate processing} to other handlers.
   *
   * @typeparam TMeans A type of request processing means.
   */
  export interface Agent<TMeans> {

    /**
     * Delegates request processing to the next `handler` and optionally modifies processing means by creating a new
     * context with the given `modifications` applied. The rest of the properties remain unchanged.
     *
     * @param handler  Target handler to delegate request processing to.
     * @param modifications  Request processing means modifications. `this` context will be passed to the next
     * `handler` when omitted
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next(
        this: void,
        handler: RequestHandler<TMeans>,
        modifications?: RequestModifications<TMeans>,
    ): Promise<boolean>;

    /**
     * Delegates request processing to the next `handler` and extends processing means by creating a new context with
     * the given `extensions` applied. The rest of the properties remain unchanged.
     *
     * @typeparam TExt  A type of request processing means extensions.
     * @param handler  Target handler accepting extended context to delegate request processing to.
     * @param extensions  Request processing means extensions.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt>(
        this: void,
        handler: RequestHandler<TMeans & TExt>,
        extensions: RequestExtensions<TMeans, TExt>,
    ): Promise<boolean>;

  }

}
