/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import { RequestCapability } from '../request-capability';
import type { RequestHandler } from '../request-handler';
import { requestExtension } from '../request-modification';
import type { LoggerMeans } from './logger.means';
import type { RequestLogger } from './request-logger';

/**
 * Request logging capability.
 *
 * Provides {@link LoggerMeans request logger means} for handlers.
 *
 * @typeParam TInput  A type of request processing means required in order to apply this capability.
 * @typeParam TLogger  Request logger type.
 */
export interface Logging<TInput = unknown, TLogger extends RequestLogger = RequestLogger>
    extends RequestCapability<TInput, LoggerMeans<TLogger>> {

  /**
   * Configures a logging capability with the given logger.
   *
   * @typeParam TNewLogger  Request logger type.
   * @param log  A logger to use for request processing.
   *
   * @returns New request logging capability.
   */
  logBy<TNewLogger extends RequestLogger>(log: TNewLogger): Logging<TInput, TNewLogger>;

}

/**
 * @internal
 */
class LoggingCapability<TInput, TLogger extends RequestLogger>
    extends RequestCapability<TInput, LoggerMeans<TLogger>>
    implements Logging<TInput, TLogger> {

  readonly for: <TMeans extends TInput>(
      handler: RequestHandler<TMeans & LoggerMeans<TLogger>>,
  ) => RequestHandler<TMeans>;

  constructor(log: TLogger, byDefault = false) {
    super();
    if (byDefault) {
      this.for = <TMeans extends TInput>(
          handler: RequestHandler<TMeans & LoggerMeans<TLogger>>,
      ): RequestHandler<TMeans> => context => {
        if ((context as Partial<LoggerMeans>).log) {
          return context.next(handler);
        }
        return context.next(handler, requestExtension({ log }));
      };
    } else {
      this.for = <TMeans extends TInput>(
          handler: RequestHandler<TMeans & LoggerMeans<TLogger>>,
      ): RequestHandler<TMeans> => context => context.next(handler, requestExtension({ log }));
    }
  }

  logBy<TNewLogger extends RequestLogger>(
      log: TNewLogger,
  ): Logging<TInput, TNewLogger> {
    return new LoggingCapability(log);
  }

}

/**
 * Request logging capability instance.
 *
 * Uses a global `console` as {@link LoggerMeans.log request logger}, unless the logger is present in request context
 * already.
 */
export const Logging: Logging = (/*#__PURE__*/ new LoggingCapability<unknown, RequestLogger>(console, true));
