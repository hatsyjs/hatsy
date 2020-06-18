/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from './request-context';

/**
 * Request body processing means.
 *
 * @category Core
 * @typeparam TBody  A type of request body.
 */
export interface RequestBodyMeans<TBody> {

  /**
   * Request body.
   */
  readonly requestBody: TBody;

}

/**
 * Signature of request body transformer function.
 *
 * @category Core
 * @typeparam TMeans  A type of request processing means.
 * @typeparam TFrom  A type of original, non-transformed body.
 * @typeparam TBody  A type of transformed body.
 */
export type RequestBodyTransformer<TMeans, TFrom, TBody> =
/**
 * @param from  Original body to transform.
 * @param context  Request processing context to perform transformation in.
 *
 * @returns Transformed request body or promise-like instance resolving to it.
 */
    (this: void, from: TFrom, context: RequestContext<TMeans>) => TBody | PromiseLike<TBody>;
