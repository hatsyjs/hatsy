/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from './request-context';
import { RequestModification } from './request-modification';

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
   * @typeparam TMeans  A type of request processing means expected by modifier.
   * @param context  Request processing context to modify.
   *
   * @returns Request modifications to apply.
   */
  modification<TMeans extends TInput>(context: RequestContext<TMeans>): RequestModification<TMeans, TExt>;

  /**
   * Updates subsequent request modifications.
   *
   * It is called before request modification applied to the same request after this one. It can update the
   * modification to apply.
   *
   * When multiple modifications already applied to request, then this method will be called for each of them
   * in the order reverse to their application (i.e. for the most recent modification first).
   *
   * @typeparam TNext  A type of extension of subsequent request processing means.
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
 * @category Core
 * @typeparam TMeans  A type of request processing means
 * @param modification  Modification to check.
 *
 * @returns `true` if the given modifier contains a {@link RequestModifier__symbol} property, or `false` otherwise.
 */
export function isRequestModifier<TMeans, TExt>(
    modification: RequestModification<TMeans, TExt> | RequestModifier<TMeans, TExt>,
): modification is RequestModifier<TMeans, TExt> {
  return RequestModifier__symbol in modification;
}