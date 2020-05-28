/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * A error corresponding to the given HTTP status code.
 *
 * {@link HatsyHandler HTTP handlers} may raise this error. The {@link hatsyRenderError} handler would render
 * corresponding error page then.
 *
 * @category Core
 * @see {@link HatsyConfig.ignoreErrors}
 */
export class HatsyHttpError extends Error {

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
