/**
 * @packageDocumentation
 * @module @proc7ts/hatsy
 */
import { HatsyHandler, HatsyRequestContext } from '../handler';

export function hatsyRenderHtml(html: string | PromiseLike<string>): HatsyHandler {
  return async ({ response }: HatsyRequestContext): Promise<void> => {

    const content = await html;

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(content);
  };
}
