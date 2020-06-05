/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { HatsyHandler } from '../handler';
import { HTTPMatters } from './http-matters';

/**
 * HTTP request handler signature.
 *
 * HTTP request handler is called once per request. It accepts a {@link HatsyContext request processing context}
 * containing {@link HTTPMatters HTTP request processing matters} used to respond or to delegate to another handler.
 *
 * @category HTTP
 * @typeparam TRequest  A type of supported HTTP request.
 * @typeparam TResponse  A type of supported HTTP response.
 * @typeparam TMatters  A type of request processing matters required in addition to {@link HTTPMatters HTTP request
 * processing} ones.
 */
export type HTTPHandler<
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    TMatters = object,
> = HatsyHandler<HTTPMatters<TRequest, TResponse> & TMatters>;
