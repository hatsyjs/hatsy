/**
 * Request body processing means.
 *
 * @typeParam TBody - A type of request body.
 */
export interface RequestBodyMeans<TBody> {
  /**
   * Request body.
   */
  readonly requestBody: TBody;
}
