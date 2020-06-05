/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyContext } from '../../context';
import { HTTPHandler } from '../http-handler';
import { HTTPMatters } from '../http-matters';

/**
 * Builds HTTP request handler that renders the given value as JSON on response.
 *
 * @category HTTP
 * @param value  A value to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function renderJSON(value: any | PromiseLike<any>): HTTPHandler {
  return async ({ response }: HatsyContext<HTTPMatters>): Promise<void> => {

    const content = await value;

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content));
  };
}
