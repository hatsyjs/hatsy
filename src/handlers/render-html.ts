/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyHandler, HatsyRequestContext } from '../handler';

/**
 * Builds HTTP request handler that renders provided HTML on response.
 *
 * @category Core
 * @param html  HTML text to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function hatsyRenderHtml(html: string | PromiseLike<string>): HatsyHandler {
  return async ({ response }: HatsyRequestContext): Promise<void> => {

    const content = await html;

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(content);
  };
}
