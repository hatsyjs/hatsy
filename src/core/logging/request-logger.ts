import type { Logger } from '@proc7ts/logger';

/**
 * A logger to use during request processing.
 */
export interface RequestLogger extends Logger {
  /**
   * Logs error.
   *
   * @param args - Arbitrary arguments to log.
   */
  error(...args: unknown[]): void;

  /**
   * Logs warning.
   *
   * @param args - Arbitrary arguments to log.
   */
  warn(...args: unknown[]): void;

  /**
   * Logs informational message.
   *
   * @param args - Arbitrary arguments to log.
   */
  info(...args: unknown[]): void;

  /**
   * Logs debug message.
   *
   * @param args - Arbitrary arguments to log.
   */
  debug(...args: unknown[]): void;

  /**
   * Logs tracing message.
   *
   * This may lead to outputting of stack trace.
   *
   * @param args - Arbitrary arguments to log.
   */
  trace(...args: unknown[]): void;
}
