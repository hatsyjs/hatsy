/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
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

