/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext, RequestModification } from '../../request-context';
import { requestHandler, RequestHandler } from '../../request-handler';
import { HttpMeans } from '../index';
import { RenderMeans } from './render-means';

/**
 * Builds HTTP response body rendering handler.
 *
 * Builds {@link RenderMeans HTTP response body render means} and delegates to rendering handler(s).
 *
 * @category HTTP
 * @typeparam TMeans  Incoming HTTP request processing means.
 * @param handlers  Response rendering handler or iterable of handlers.
 *
 * @returns HTTP request processing handler.
 */
export function httpRenderer<TMeans extends HttpMeans>(
    handlers: RequestHandler<TMeans & RenderMeans> | Iterable<RequestHandler<TMeans & RenderMeans>>,
): RequestHandler<TMeans> {

  const handler = requestHandler<TMeans & RenderMeans>(handlers);

  return async ({ request: { method }, response, next }: RequestContext<TMeans>) => {

    const renderBody = (body: string | Buffer, encoding: BufferEncoding = 'utf-8'): void => {

      const length = Buffer.isBuffer(body) ? body.byteLength : Buffer.byteLength(body, encoding);

      response.setHeader('Content-Length', length);
      if (method === 'HEAD') {
        response.end();
      } else {
        response.end(body, encoding);
      }
    };
    const means: Omit<RenderMeans, keyof HttpMeans> & Partial<HttpMeans> = {

      renderBody,

      renderHtml(html: string | Buffer) {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        renderBody(html);
      },

      renderJson(body: any) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        renderBody(JSON.stringify(body));
      },

    };

    await next<RenderMeans>(
        handler,
        means as RequestModification<TMeans, RenderMeans>,
    );
  };
}
