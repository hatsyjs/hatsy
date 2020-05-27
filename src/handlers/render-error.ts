/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HatsyRequestContext } from '../handler';
import { HatsyHttpError } from '../http-error';
import { hatsyRenderHtml } from './render-html';

/**
 * HTTP processing error context.
 *
 * This context is created once error is thrown by one of the handlers before passing it to
 * {@link HatsyConfig.errorHandler error handler}.
 */
export interface HatsyErrorContext extends HatsyRequestContext {

  /**
   * Error thrown.
   */
  readonly error: any;

}

/**
 * HTTP request processing error handler that renders HTML page with error info.
 *
 * Threats {@link HatsyHttpError HTTP status error} as HTTP status code to set for error page.
 *
 * @param context  HTTP processing error context.
 *
 * @returns New HTTP request handler.
 */
export async function hatsyRenderError(context: HatsyErrorContext): Promise<void> {

  const { error, response, next } = context;

  if (error instanceof HatsyHttpError) {
    response.statusCode = error.statusCode;
    if (error.statusMessage) {
      response.statusMessage = error.statusMessage;
    }
  } else {
    response.statusCode = 500;
    response.statusMessage = 'Internal Server Error';
  }

  await next(hatsyRenderHtml(
      `<!DOCTYPE html>
<html lang="en">
<head>
<title>ERROR ${response.statusCode} ${response.statusMessage}</title>
</head>
<body>
<h1><strong>ERROR ${response.statusCode}</strong> ${response.statusMessage}</h1>
</body>
</html>
`,
  ));
}
