/**
 * HTTP response body render means.
 *
 * It is implied that response body is generated by these means only. I.e. nothing is written to `ServerResponse`
 * directly.
 *
 * All `renderXXX` methods write `Content-Length` header. They skip writing content body when request method is `HEAD`.
 */
export interface RenderMeans {

  /**
   * Renders response body.
   *
   * @param body - Response body text or Buffer.
   * @param encoding - Response body buffer encoding. Ignored for buffer.
   */
  renderBody(this: void, body: string | Buffer, encoding?: BufferEncoding): void;

  /**
   * Renders HTML response body.
   *
   * Generates content in `UTF-8` encoding and sets `Content-Type: text/html; charset=utf-8` header.
   *
   * @param html - HTML response text or Buffer.
   */
  renderHtml(this: void, html: string | Buffer): void;

  /**
   * Renders JSON response body.
   *
   * Generates content in `UTF-8` encoding and sets `Content-Type: application/json; charset=utf-8` header.
   *
   * @param body - JSON object to stringify.
   */
  renderJson(this: void, body: unknown): void;

}
