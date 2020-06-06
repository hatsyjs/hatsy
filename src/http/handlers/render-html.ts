/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from '../../request-context';
import { HttpHandler } from '../http-handler';
import { HttpMatters } from '../http-matters';

/**
 * Builds HTTP request handler that renders provided HTML on response.
 *
 * @category HTTP
 * @param html  HTML text to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function renderHtml(html: string | PromiseLike<string>): HttpHandler {
  return async ({ response }: RequestContext<HttpMatters>): Promise<void> => {

    const content = await html;

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(content);
  };
}
