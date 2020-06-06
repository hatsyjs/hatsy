/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from '../../request-context';
import { HttpHandler } from '../http-handler';
import { HttpMatters } from '../http-matters';

/**
 * Builds HTTP request handler that renders the given value as JSON on response.
 *
 * @category HTTP
 * @param value  A value to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function renderJson(value: any | PromiseLike<any>): HttpHandler {
  return async ({ response }: RequestContext<HttpMatters>): Promise<void> => {

    const content = await value;

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content));
  };
}
