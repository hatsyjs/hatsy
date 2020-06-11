/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestCapability, RequestContext, RequestModification } from '../../core';
import { HttpMeans } from '../index';

/**
 * HTTP response body render means.
 *
 * It is implied that response body is generated by these means only. I.e. nothing is written to `ServerResponse`
 * directly.
 *
 * All `renderXXX` methods write `Content-Length` header. They skip writing content body when request method is `HEAD`.
 *
 * @category HTTP
 */
export interface RenderMeans extends HttpMeans {

  /**
   * Renders response body.
   *
   * @param body  Response body text or Buffer.
   * @param encoding  Response body buffer encoding. Ignored for buffer.
   */
  renderBody(this: void, body: string | Buffer, encoding?: BufferEncoding): void;

  /**
   * Renders HTML response body.
   *
   * Generates content in `UTF-8` encoding and sets `Content-Type: text/html; charset=utf-8` header.
   *
   * @param html  HTML response text or Buffer.
   */
  renderHtml(this: void, html: string | Buffer): void;

  /**
   * Renders JSON response body.
   *
   * Generates content in `UTF-8` encoding and sets `Content-Type: application/json; charset=utf-8` header.
   *
   * @param body  JSON object to stringify.
   */
  renderJson(this: void, body: any): void;

}

/**
 * @internal
 */
class RenderExtension extends RequestCapability<HttpMeans, RenderMeans> {

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

export const RenderMeans: RequestCapability<HttpMeans, RenderMeans> = new RenderExtension();
