import type { RequestLogger } from './request-logger';

/**
 * Request logger means.
 *
 * @typeParam TLogger - Request logger type.
 */
export interface LoggerMeans<TLogger extends RequestLogger = RequestLogger> {
  /**
   * A logger to use during request processing.
   */
  readonly log: TLogger;
}
