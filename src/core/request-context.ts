/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import type { RequestHandler } from './request-handler';
import type { RequestModification } from './request-modification';

/**
 * Request processing context.
 *
 * It is passed to {@link RequestHandler request processing handler}. It the necessary means. The handler can either
 * respond by these means, or delegate processing to the {@link RequestContext.Agent.next next handler}.
 *
 * The context instance is immutable. The request processing means it contains can be {@link RequestModification
 * modified} or even extended when delegating request processing to the {@link RequestContext.Agent.next next handler}
 * by creating another context based on original one.
 *
 * @typeparam TMeans  Request processing means of this context.
 */
export type RequestContext<TMeans> = TMeans & RequestContext.Agent<TMeans>;

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
     * @param modification  Request processing means modification. `this` context will be passed to the next
     * `handler` when omitted.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt = object>(
        this: void,
        handler: RequestHandler<TMeans & TExt>,
        modification?: RequestModification<TMeans, TExt>,
    ): Promise<boolean>;

  }

}
