/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext, RequestModification } from './request-context';

/**
 * A unique key of {@link RequestModifier} property containing its unique identifier.
 *
 * Used to distinguish request modifiers from raw request modifications.
 *
 * @category Core
 */
export const RequestModifier__symbol = (/*#__PURE__*/ Symbol('request-modifier'));

/**
 * Request modifier.
 *
 * Customizes {@link RequestModification request modification} when {@link RequestContext.Agent.next delegating request
 * processing}.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means to modify.
 * @typeparam TExt  A type of request processing means extension.
 */
export interface RequestModifier<TInput, TExt> {

  /**
   * Unique modifier identifier.
   *
   * The {@link RequestContext.Agent.modifiedBy} method can be used to check whether this modifier is already
   * applied to request.
   *
   * This is typically used to prevent the modifier from being applied more than once to the same request.
   */
  readonly [RequestModifier__symbol]: any;

  /**
   * Builds request modification to apply.
   *
   * @param context  Request processing context to modify.
   *
   * @returns Request modifications to apply.
   */
  modification(context: RequestContext<TInput>): RequestModification<TInput, TExt>;

  /**
   * Updates subsequent request modifications.
   *
   * It is called before request modification applied to the same request after this one. It can update the
   * modification to apply.
   *
   * When multiple modifications already applied to request, then this method will be called for each of them
   * in the order reverse to their application (i.e. for the most recent modification first).
   *
   * @param context  Request context the modification is applied to.
   * @param modification  Request modification applied.
   *
   * @returns Updated request modification that will be applied to
   */
  modify?<TNext>(
      context: RequestContext<TInput & TExt>,
      modification: RequestModification<TInput & TExt, TNext>,
  ): RequestModification<TInput & TExt, TNext>;

}

/**
 * Checks whether the given request modification is request modifier.
 *
 * @param modification  Modification to check.
 *
 * @returns `true` if the given modifier contains a {@link RequestModifier__symbol} property, or `false` otherwise.
 */
export function isRequestModifier<TMeans, TExt>(
    modification: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
): modification is RequestModifier<TMeans, TExt> {
  return RequestModifier__symbol in modification;
}
