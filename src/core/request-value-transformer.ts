/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from './request-context';

/**
 * Signature of request value transformer function.
 *
 * It is used to transform values in context of request processing.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means.
 * @typeparam TFrom  A type of original, non-transformed value.
 * @typeparam TTo  A type of transformed value.
 */
export type RequestValueTransformer<TMeans, TFrom, TTo> =
/**
 * @param from  Original value to transform.
 * @param context  Request processing context to perform transformation in.
 *
 * @returns Transformed value or promise-like instance resolving to it.
 */
    (this: void, from: TFrom, context: RequestContext<TMeans>) => TTo | PromiseLike<TTo>;
