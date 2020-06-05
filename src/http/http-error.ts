/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * A error corresponding to the given HTTP status code.
 *
 * {@link HatsyHandler HTTP handlers} may raise this error. The {@link renderHTTPError} handler would render
 * corresponding error page then.
 *
 * @category HTTP
 * @see {@link HTTPConfig.errorHandler}
 */
export class HTTPError extends Error {

  /**
   * Constructs HTTP status error.
   *
   * @param statusCode  HTTP status code.
   * @param statusMessage  HTTP status message.
   */
  constructor(
      readonly statusCode: number,
      readonly statusMessage?: string,
  ) {
    super(statusMessage ? `${statusCode} ${statusMessage}` : `${statusCode}`);
  }

}
