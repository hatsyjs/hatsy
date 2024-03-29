import { escapeXML } from 'httongue';
import { STATUS_CODES } from 'node:http';
import { ErrorMeans } from '../../core/error.means.js';
import { RequestContext } from '../../core/request-context.js';
import { RequestHandler } from '../../core/request-handler.js';
import { dispatchByAccepted } from '../dispatch/dispatch-by-accepted.handler.js';
import { HttpError } from '../http-error.js';
import { HttpMeans } from '../http.means.js';
import { RenderMeans } from './render.means.js';
import { Rendering } from './rendering.capability.js';

/**
 * @internal
 */
function errorDetails({ error, response }: RequestContext<HttpMeans & ErrorMeans>): {
  code: number;
  message?: string;
  details?: string;
} {
  let message: string | undefined;
  let details: string | undefined;

  if (error instanceof HttpError) {
    response.statusCode = error.statusCode;

    const { statusMessage } = error;

    if (statusMessage) {
      response.statusMessage = statusMessage;
      message = statusMessage;
    } else {
      message = STATUS_CODES[error.statusCode];
    }
    details = error.details;
  } else {
    response.statusCode = 500;
    message = 'Internal Server Error';
  }

  return { code: response.statusCode, message, details };
}

/**
 * @internal
 */
function renderHtmlError(context: RequestContext<HttpMeans & RenderMeans & ErrorMeans>): void {
  const details = errorDetails(context);
  const message = details.message ? ' ' + escapeXML(details.message) : '';
  const detailsText = details.details ? escapeXML(details.details) : '';

  context.renderHtml(
    `<!DOCTYPE html>
<html lang="en">
<head>
<title>ERROR ${details.code}${message}</title>
</head>
<body>
<h1><strong>ERROR ${details.code}</strong>${message}</h1>
<hr/>
${detailsText}
</body>
</html>
`,
  );
}

/**
 * @internal
 */
function renderJsonError(context: RequestContext<HttpMeans & RenderMeans & ErrorMeans>): void {
  context.renderJson({ error: errorDetails(context) });
}

/**
 * HTTP request processing error handler that renders HTML page with error info.
 *
 * Threats {@link HttpError HTTP status error} as HTTP status code to set for error page.
 *
 * Renders either JSON or HTML error page.
 */
export const renderHttpError: RequestHandler<HttpMeans & ErrorMeans> = /*#__PURE__*/ Rendering.for(
  /*#__PURE__*/ dispatchByAccepted<HttpMeans & ErrorMeans & RenderMeans>(
    {
      'application/json': renderJsonError,
      'text/json': renderJsonError,
      'text/html': renderHtmlError,
      '*/*': renderHtmlError,
    },
    renderHtmlError,
  ),
);
