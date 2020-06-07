/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * A error corresponding to the given HTTP status code.
 *
 * {@link HttpHandler HTTP handlers} may raise this error. The {@link renderHttpError} handler would render
 * corresponding error page then.
 *
 * @category HTTP
 * @see HttpConfig.errorHandler
 */
export class HttpError extends Error {

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
