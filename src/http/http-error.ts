/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * A error corresponding to the given HTTP status code.
 *
 * HTTP request processing handlers may raise this error. The {@link renderHttpError error handler} would render
 * corresponding error page then.
 *
 * @see HttpConfig.errorHandler
 */
export class HttpError extends Error {

  /**
   * HTTP status message.
   */
  readonly statusMessage?: string;

  /**
   * Error details.
   *
   * This will be displayed on error page in addition to error code.
   */
  readonly details?: string;

  /**
   * Arbitrary error reason.
   *
   * This is another error typically.
   */
  readonly reason?: any;

  /**
   * Constructs HTTP status error.
   *
   * @param statusCode  HTTP status code.
   * @param options  HTTP error options.
   */
  constructor(readonly statusCode: number, options: HttpError.Options = {}) {
    super(httpErrorMessage(statusCode, options));
    this.statusMessage = options.statusMessage;
    this.details = options.details;
    this.reason = options.reason;
  }

  /**
   * Constructs loggable error representation.
   *
   * Returns an array containing error message, details, and reason.
   */
  toLog(): any[] {

    const report: any[] = [this.message];
    const { details, reason } = this;

    if (details) {
      report.push(details);
    }
    if (reason) {
      report.push(reason);
    }

    return report;
  }

}

function httpErrorMessage(
    statusCode: number,
    {
      statusMessage,
      message = statusMessage ? `${statusCode} ${statusMessage}` : `${statusCode}`,
    }: HttpError.Options,
): string {
  return message;
}

export namespace HttpError {

  /**
   * Options for {@link HttpError HTTP error} construction.
   */
  export interface Options {

    /**
     * HTTP status message.
     */
    readonly statusMessage?: string;

    /**
     * Error message.
     *
     * @default Constructed by status code and status message.
     */
    readonly message?: string;

    /**
     * Error details.
     *
     * This will be displayed on error page in addition to error code.
     */
    readonly details?: string;

    /**
     * Arbitrary error reason.
     *
     * This is another error typically.
     */
    readonly reason?: any;

  }

}
