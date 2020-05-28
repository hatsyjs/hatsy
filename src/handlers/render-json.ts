/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyHandler, HatsyRequestContext } from '../handler';

/**
 * Builds HTTP request handler that renders the given value as JSON on response.
 *
 * @category Core
 * @param value  A value to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function hatsyRenderJson(value: any | PromiseLike<any>): HatsyHandler {
  return async ({ response }: HatsyRequestContext): Promise<void> => {

    const content = await value;

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content));
  };
}
