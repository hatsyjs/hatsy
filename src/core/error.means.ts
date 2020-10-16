/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
/**
 * Error processing means.
 *
 * A context with these means is created once error is thrown by one of the handlers right before passing it to error
 * handler.
 *
 * @typeParam TError  Error type.
 */
export interface ErrorMeans<TError = any> {

  /**
   * Error thrown.
   */
  readonly error: TError;

}
