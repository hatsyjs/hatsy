/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
/**
 * Request body processing means.
 *
 * @typeparam TBody  A type of request body.
 */
export interface RequestBodyMeans<TBody> {

  /**
   * Request body.
   */
  readonly requestBody: TBody;

}

