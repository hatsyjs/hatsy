/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';

/**
 * HTTP request processing matters.
 *
 * When passed to {@link HTTPHandler HTTP handler} the latter responds by utilizing the passed in [[response]],
 * or delegates to {@link HatsyContext.Agent.next next handler}.
 *
 * @category HTTP
 */
export interface HTTPMatters {

  /**
   * HTTP request.
   */
  readonly request: IncomingMessage;

  /**
   * HTTP response.
   */
  readonly response: ServerResponse;

  /**
   * A logger to use.
   */
  readonly log: Console;

}
