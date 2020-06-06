/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestHandler } from './request-handler';

/**
 * Error processing matters.
 *
 * A context containing this matters is created once error is thrown by one of the handlers before passing it to error
 * handler.
 *
 * @category Core
 */
export interface ErrorMatters {

  /**
   * Error thrown.
   */
  readonly error: any;

}

/**
 * Error processing handler.
 *
 * Accepts a {@link RequestContext request processing context} containing {@link ErrorMatters error processing matters}
 * used to respond or delegate to another handler.
 *
 * @category Core
 * @typeparam TMatters  A type of request processing matters required in addition to {@link ErrorMatters error
 * processing} ones.
 */
export type ErrorHandler<TMatters = object> = RequestHandler<ErrorMatters & TMatters>;
