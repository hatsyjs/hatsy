import type { DueLog, Loggable } from '@proc7ts/logger';

/**
 * A error corresponding to the given HTTP status code.
 *
 * HTTP request processing handlers may raise this error. The {@link renderHttpError error handler} would render
 * corresponding error page then.
 *
 * @see HttpConfig.errorHandler
 */
export class HttpError extends Error implements Loggable {

  /**
   * HTTP status message.
   */
  readonly statusMessage?: string | undefined;

  /**
   * Error details.
   *
   * This will be displayed on error page in addition to error code.
   */
  readonly details?: string | undefined;

  /**
   * Arbitrary error reason.
   *
   * This is another error typically.
   */
  readonly reason?: unknown | undefined;

  /**
   * Constructs HTTP status error.
   *
   * @param statusCode - HTTP status code.
   * @param options - HTTP error options.
   */
  constructor(readonly statusCode: number, options: HttpError.Options = {}) {
    super(httpErrorMessage(statusCode, options));
    this.statusMessage = options.statusMessage;
    this.details = options.details;
    this.reason = options.reason;
  }

  /**
   * Performs additional message processing before it is logged.
   *
   * At output or default logging stage replaces this error with error message, details, and reason. Does nothing at
   * other logging stages.
   *
   * @returns Either new loggable value representation, or nothing outside the output logging stage.
   */
  toLog({ on = 'out' }: DueLog): unknown[] | void {
    if (on !== 'out') {
      return;
    }

    const report: unknown[] = [this.message];
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
    readonly statusMessage?: string | undefined;

    /**
     * Error message.
     *
     * @default Constructed by status code and status message.
     */
    readonly message?: string | undefined;

    /**
     * Error details.
     *
     * This will be displayed on error page in addition to error code.
     */
    readonly details?: string | undefined;

    /**
     * Arbitrary error reason.
     *
     * This is another error typically.
     */
    readonly reason?: unknown | undefined;

  }

}
