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

  readonly #statusCode: number;
  readonly #statusMessage?: string | undefined;
  readonly #details?: string | undefined;

  /**
   * Constructs HTTP status error.
   *
   * @param statusCode - HTTP status code.
   * @param options - HTTP error options.
   */
  constructor(statusCode: number, options: HttpError.Options = {}) {
    super(httpErrorMessage(statusCode, options), options);
    this.name = 'HttpError';
    this.#statusCode = statusCode;
    this.#statusMessage = options.statusMessage;
    this.#details = options.details;
  }

  /**
   * HTTP status code.
   */
  get statusCode(): number {
    return this.#statusCode;
  }

  /**
   * HTTP status message.
   */
  get statusMessage(): string | undefined {
    return this.#statusMessage;
  }

  /**
   * Error details.
   *
   * This will be displayed on error page in addition to error code.
   */
  get details(): string | undefined {
    return this.#details;
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
    const { details, cause } = this;

    if (details) {
      report.push(details);
    }
    if (cause) {
      report.push(cause);
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
  export interface Options extends ErrorOptions {
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
  }
}
