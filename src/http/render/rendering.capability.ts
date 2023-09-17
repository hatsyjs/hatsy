import { RequestCapability } from '../../core/request-capability.js';
import { RequestHandler } from '../../core/request-handler.js';
import { requestExtension } from '../../core/request-modification.js';
import type { HttpMeans } from '../http.means.js';
import type { RenderMeans } from './render.means.js';

/**
 * @internal
 */
class RenderingCapability extends RequestCapability<HttpMeans, RenderMeans> {

  for<TMeans extends HttpMeans>(
    handler: RequestHandler<TMeans & RenderMeans>,
  ): RequestHandler<TMeans> {
    return ({ request: { method }, response, next }) => {
      const renderBody = (body: string | Buffer, encoding: BufferEncoding = 'utf-8'): void => {
        const length = Buffer.isBuffer(body) ? body.byteLength : Buffer.byteLength(body, encoding);

        response.setHeader('Content-Length', length);
        if (method === 'HEAD') {
          response.end();
        } else {
          response.end(body, encoding);
        }
      };

      return next(
        handler,
        requestExtension<TMeans, RenderMeans>({
          renderBody,

          renderHtml(html: string | Buffer) {
            response.setHeader('Content-Type', `text/html; charset=utf-8`);
            renderBody(html);
          },

          renderJson(body: unknown) {
            response.setHeader('Content-Type', `application/json; charset=utf-8`);
            renderBody(JSON.stringify(body));
          },
        }),
      );
    };
  }

}

/**
 * HTTP response rendering capability.
 *
 * Provides {@link RenderMeans HTTP response body render means} for handlers.
 */
export const Rendering: RequestCapability<HttpMeans, RenderMeans> =
  /*#__PURE__*/ new RenderingCapability();
