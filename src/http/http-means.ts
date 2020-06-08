/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';

/**
 * HTTP request processing means.
 *
 * When passed to HTTP handler the latter responds by utilizing the passed in [[response]], or delegates to the
 * {@link RequestContext.Agent.next next handler}.
 *
 * @category HTTP
 * @typeparam TRequest  HTTP request type.
 * @typeparam TResponse  HTTP response type.
 */
export interface HttpMeans<
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    > {

  /**
   * HTTP request.
   */
  readonly request: TRequest;

  /**
   * HTTP response.
   */
  readonly response: TResponse;

  /**
   * A logger to use.
   */
  readonly log: Console;

}