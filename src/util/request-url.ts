/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage } from 'http';
import { TLSSocket } from 'tls';
import { ProxyForwardTrust, trustedForward } from './trusted-forward';

/**
 * Builds full request URL.
 *
 * Either extracts this info from [Forwarded] HTTP header accordingly to the trust policy, or detects it by request.
 *
 * [Forwarded]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded
 *
 * @category Utilities
 * @param request  HTTP request.
 * @param forwardTrust  A trust policy to proxy forwarding information.
 *
 * @returns Request URL.
 */
export function requestURL(
    request: IncomingMessage,
    forwardTrust?: ProxyForwardTrust,
): URL {

  const forwarded = trustedForward(request, forwardTrust);
  const { connection, url = '', headers } = request;
  const protocol = forwarded?.proto || ((connection as TLSSocket).encrypted ? 'https' : 'http');
  const host = forwarded?.host || headers.host || (`${connection.localAddress}:${connection.localPort}`);

  return new URL(url, `${protocol}://${host}`);
}
