/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { ErrorMeans, RequestContext } from '../../core';
import { HttpError } from '../http-error';
import { HttpMeans } from '../http.means';
import { escapeHtml } from '../util';
import { RenderMeans } from './render.means';
import { Rendering } from './rendering.capability';

/**
 * @internal
 */
function renderHttpErrorPage(
    {
      error,
      response,
      renderHtml,
    }: RequestContext<HttpMeans & RenderMeans & ErrorMeans>,
): void {

  let message: string;
  let details: string;

  if (error instanceof HttpError) {
    response.statusCode = error.statusCode;

    const { statusMessage } = error;

    if (statusMessage) {
      response.statusMessage = statusMessage;
      message = ` ${escapeHtml(statusMessage)}`;
    }
    message = escapeHtml(statusMessage);
    details = `<p>${escapeHtml(error.details)}</p>`;
  } else {
    response.statusCode = 500;
    message = ' Internal Server Error';
    details = '';
  }

  renderHtml(
      `<!DOCTYPE html>
<html lang="en">
<head>
<title>ERROR ${response.statusCode}${message}</title>
</head>
<body>
<h1><strong>ERROR ${response.statusCode}</strong>${message}</h1>
<hr/>
${details}
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
 * @param context  HTTP error processing context.
 *
 * @returns New HTTP request handler.
 */
export async function renderHttpError(context: RequestContext<HttpMeans & ErrorMeans>): Promise<void> {
  await context.next(Rendering.for<HttpMeans & ErrorMeans>(renderHttpErrorPage));
}
