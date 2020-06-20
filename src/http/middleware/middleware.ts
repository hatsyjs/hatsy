/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage, ServerResponse } from 'http';
import { RequestContext, RequestModification } from '../../core';
import { HttpMeans } from '../http.means';

/**
 * HTTP middleware signature.
 *
 * This is a [connect]-style middleware.
 *
 * [connect]: https://github.com/senchalabs/connect
 *
 * @category HTTP
 */
export type Middleware =
/**
 * @param request  HTTP request.
 * @param response HTTP response.
 * @param next  Next function to delegate request processing to or report error with.
 */
    (
        this: void,
        request: IncomingMessage,
        response: ServerResponse,
        next: Middleware.Next,
    ) => void;

export namespace Middleware {

  /**
   * A signature of the function the {@link Middleware middleware} may call to delegate request processing
   * or report error with.
   */
  export type Next =
  /**
   * @param error  Either an error to report, or nothing to delegate request processing to next handler.
   */
      (this: void, error?: any) => void;

  /**
   * A signature of function extracting request modification after middleware execution.
   *
   * When middleware modifies the request or response objects such function can be used to extract this modification
   * to pass it downstream.
   *
   * @typeparam TInput  A type of input HTTP request processing means.
   * @typeparam TExt  A type of request processing means extension applied by middleware.
   */
  export type Modification<TInput extends HttpMeans, TExt> =
  /**
   * @param context  HTTP request processing context the middleware received request and response from.
   *
   * @returns Extracted request modification or a promise-like instance resolving to it.
   */
      (
          this: void,
          context: RequestContext<TInput>,
      ) => RequestModification<TInput, TExt> | PromiseLike<RequestModification<TInput, TExt>>;

}

/**
 * @category HTTP
 */
export const Middleware = {

  /**
   * Executes middleware in the given HTTP request processing context.
   *
   * @param middleware  Middleware to execute.
   * @param context  HTTP request processing context.
   *
   * @returns A promise resolved to `true` when middleware responded, or to `false` when it delegated to the `next`
   * handler.
   */
  exec(
      this: void,
      middleware: Middleware,
      context: RequestContext<HttpMeans>,
  ): Promise<boolean> {

    const { request, response } = context;

    return new Promise<boolean>((resolve, reject) => {

      const respond = (): void => resolve(true);

      response.on('error', reject);
      response.on('finish', respond);
      response.on('close', respond);

      const next = (error?: any): void => {
        if (error !== undefined) {
          reject(error);
        } else {
          resolve();
        }
      };

      middleware(request, response, next);
      if (response.writableEnded || response.destroyed) {
        respond();
      }
    });
  },

};
