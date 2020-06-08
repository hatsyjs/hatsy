/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from '../../request-context';
import { RequestHandler } from '../../request-handler';
import { HttpMeans } from '../http-means';

/**
 * Builds HTTP request handler that renders the given value as JSON on response.
 *
 * @category HTTP
 * @param value  A value to render or its promise.
 *
 * @returns HTTP request handler.
 */
export function renderJson(value: any | PromiseLike<any>): RequestHandler<HttpMeans> {
  return async ({ response }: RequestContext<HttpMeans>): Promise<void> => {

    const content = await value;

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content));
  };
}
