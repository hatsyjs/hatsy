/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from '../../request-context';
import { HTTPHandler } from '../http-handler';
import { HTTPMatters } from '../http-matters';

/**
 * Builds HTTP request handler that renders provided HTML on response.
 *
 * @category HTTP
 * @param html  HTML text to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function renderHtml(html: string | PromiseLike<string>): HTTPHandler {
  return async ({ response }: RequestContext<HTTPMatters>): Promise<void> => {

    const content = await html;

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(content);
  };
}
