/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { ErrorMeans } from '../../error-means';
import { RequestContext } from '../../request-context';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http-means';
import { httpRenderer } from './http-renderer';
import { RenderMeans } from './render-means';

/**
 * @internal
 */
function renderHttpErrorPage({ error, response, renderHtml }: RequestContext<RenderMeans & ErrorMeans>): void {
  if (error instanceof HttpError) {
    response.statusCode = error.statusCode;
    if (error.statusMessage) {
      response.statusMessage = error.statusMessage;
    }
  } else {
    response.statusCode = 500;
    response.statusMessage = 'Internal Server Error';
  }

  renderHtml(
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
  );
}

/**
 * HTTP request processing error handler that renders HTML page with error info.
 *
 * Threats {@link HttpError HTTP status error} as HTTP status code to set for error page.
 *
 * @category HTTP
 * @param context  HTTP error processing context.
 *
 * @returns New HTTP request handler.
 */
export async function renderHttpError(context: RequestContext<HttpMeans & ErrorMeans>): Promise<void> {
  await context.next(httpRenderer<HttpMeans & ErrorMeans>(renderHttpErrorPage));
}
