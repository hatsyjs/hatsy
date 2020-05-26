/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyHandler, HatsyRequestContext } from '../handler';

export function hatsyRenderJson<T>(value: T | PromiseLike<T>): HatsyHandler {
  return async ({ response }: HatsyRequestContext): Promise<void> => {

    const content = await value;

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content));
  };
}
