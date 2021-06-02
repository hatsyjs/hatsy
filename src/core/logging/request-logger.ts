import type { Logger } from '@proc7ts/logger';

/**
 * A logger to use during request processing.
 */
export interface RequestLogger extends Logger {

  /**
   * Logs error.
   *
   * @param args - Log message and arguments.
   */
  error(...args: unknown[]): void;

  /**
   * Logs warning.
   *
   * @param args - Log message and arguments.
   */
  warn(...args: unknown[]): void;

  /**
   * Logs informational message.
   *
   * @param args - Log message and arguments.
   */
  info(...args: unknown[]): void;

  /**
   * Logs debug message.
   *
   * @param args - Log message and arguments.
   */
  debug(...args: unknown[]): void;

}
