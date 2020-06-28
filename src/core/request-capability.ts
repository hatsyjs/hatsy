/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import { RequestCapabilities } from './request-capabilities';
import { RequestContext } from './request-context';
import { RequestHandler } from './request-handler';
import { RequestModification } from './request-modification';
import { RequestModifier, RequestModifier__symbol } from './request-modifier';

/**
 * Request processing capability.
 *
 * This is a {@link RequestModifier request modifier} implementation able to provide request processing means for
 * handlers.
 *
 * Request processing capabilities could be be {@link RequestCapabilities combined}.
 *
 * @typeparam TInput  A type of request processing means required in order to apply this capability.
 * @typeparam TExt  A type of extension to request processing means this capability applies.
 */
export abstract class RequestCapability<TInput, TExt = object>
    implements RequestModifier<TInput, TExt>, RequestCapabilities<TInput, TExt> {

  /**
   * A reference to request modifier.
   *
   * @default `this` instance.
   */
  get [RequestModifier__symbol](): RequestModifier<TInput, TExt> {
    return this;
  }

  /**
   * Builds request modification to apply by {@link for handler}.
   *
   * @typeparam TMeans  A type of request processing means to modify.
   * @param context  Request processing context to modify.
   *
   * @returns Request modifications to apply, or promise-like instance resolving to it.
   */
  abstract modification<TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ): RequestModification<TMeans, TExt> | PromiseLike<RequestModification<TMeans, TExt>>;

  /**
   * Provides request processing capability to the given handler.
   *
   * Builds request processing handler that modifies request and delegates to target `handler`.
   *
   * @typeparam TMeans  A type of request processing means expected by constructed handler.
   * @param handler  Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
  for<TMeans extends TInput>(handler: RequestHandler<TMeans & TExt>): RequestHandler<TMeans> {
    return async ({ next }) => next(handler, this);
  }

  /**
   * Combines this capability with the `next` capability set.
   *
   * @typeparam TNext  A type of extension to request processing means applied by `next` capability set.
   * @param next  Next capability set that receives requests modified by this capability.
   *
   * @return New request processing capability set that applies modifications to request by this capability,
   * and then - by the `next` capability set.
   *
   * @see RequestCapabilities.combine
   */
  and<TNext>(next: RequestCapabilities<TInput & TExt, TNext>): RequestCapabilities<TInput, TExt & TNext> {
    return RequestCapabilities.combine<TInput, TExt, TNext>(this, next);
  }

}
