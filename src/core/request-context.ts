/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestHandler } from './request-handler';
import { RequestModification } from './request-modification';
import { RequestModifier, RequestModifierRef } from './request-modifier';

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
 * @category Core
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
     * @param modification  Request processing means modification or modifier. `this` context will be passed to the next
     * `handler` when omitted.
     *
     * @returns A promise resolved when request processing finishes. Resolves to `true` when request is responded,
     * or to `false` otherwise.
     */
    next<TExt = object>(
        this: void,
        handler: RequestHandler<TMeans & TExt>,
        modification?: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
    ): Promise<boolean>;

    /**
     * Checks whether request modified with the given request modifier.
     *
     * @typeparam TInput  A type of request processing means the target modifier is able modify.
     * @typeparam TExt  A type of extension to request processing means applied by the target modifier.
     * @param ref  Request modifier reference.
     *
     * @returns This request context instance with request processing means applied, or `undefined` if target request
     * modifier is not applied yet.
     */
    modifiedBy<TInput, TExt>(ref: RequestModifierRef<TInput, TExt>): RequestContext<TMeans & TInput & TExt> | undefined;

  }

}
