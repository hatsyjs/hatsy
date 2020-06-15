/**
 * @packageDocumentation
 * @module @hatsy/hatsy
*/
import { RequestCapability, RequestContext, RequestModification } from '../../core';
import { HttpMeans } from '../http.means';
import { RenderMeans } from './render.means';

/**
 * @internal
 */
class RenderingCapability extends RequestCapability<HttpMeans, RenderMeans> {

  modification<TMeans extends HttpMeans>(
      {
        request: { method },
        response,
      }: RequestContext<TMeans>,
  ): RequestModification<TMeans, RenderMeans> {

    const renderBody = (body: string | Buffer, encoding: BufferEncoding = 'utf-8'): void => {

      const length = Buffer.isBuffer(body) ? body.byteLength : Buffer.byteLength(body, encoding);

      response.setHeader('Content-Length', length);
      if (method === 'HEAD') {
        response.end();
      } else {
        response.end(body, encoding);
      }
    };

    return {

      renderBody,

      renderHtml(html: string | Buffer) {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        renderBody(html);
      },

      renderJson(body: any) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        renderBody(JSON.stringify(body));
      },

    } as RequestModification<unknown, RenderMeans>;
  }

}

/**
 * HTTP response rendering capability.
 *
 * Provides {@link RenderMeans HTTP response body render means} for handlers.
 *
 * @category HTTP
 */
export const Rendering: RequestCapability<HttpMeans, RenderMeans> = (/*#__PURE__*/ new RenderingCapability());
