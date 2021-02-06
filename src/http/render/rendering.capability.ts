import { MIMEType } from '@frontmeans/httongue';
import { RequestCapability, requestExtension, RequestHandler } from '../../core';
import type { HttpMeans } from '../http.means';
import type { RenderMeans } from './render.means';

/**
 * @internal
 */
class RenderingCapability extends RequestCapability<HttpMeans, RenderMeans> {

  for<TMeans extends HttpMeans>(
      handler: RequestHandler<TMeans & RenderMeans>,
  ): RequestHandler<TMeans> {
    return ({
      request: { method },
      response,
      next,
    }) => {

      const renderBody = (body: string | Buffer, encoding: BufferEncoding = 'utf-8'): void => {

        const length = Buffer.isBuffer(body) ? body.byteLength : Buffer.byteLength(body, encoding);

        response.setHeader('Content-Length', length);
        if (method === 'HEAD') {
          response.end();
        } else {
          response.end(body, encoding);
        }
      };

      return next(handler, requestExtension<TMeans, RenderMeans>({

        renderBody,

        renderHtml(html: string | Buffer) {
          response.setHeader('Content-Type', `${MIMEType.HTML}; charset=utf-8`);
          renderBody(html);
        },

        renderJson(body: any) {
          response.setHeader('Content-Type', `${MIMEType.JSON}; charset=utf-8`);
          renderBody(JSON.stringify(body));
        },

      }));
    };
  }

}

/**
 * HTTP response rendering capability.
 *
 * Provides {@link RenderMeans HTTP response body render means} for handlers.
 */
export const Rendering: RequestCapability<HttpMeans, RenderMeans> = (/*#__PURE__*/ new RenderingCapability());
