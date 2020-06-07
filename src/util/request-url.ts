/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage } from 'http';
import { TLSSocket } from 'tls';
import { ProxyForwardingTrustPolicy, trustedForward } from './trusted-forward';

/**
 * Builds full request URL.
 *
 * Either extracts this info from [Forwarded] HTTP header accordingly to the trust policy, or detects it by request.
 *
 * [Forwarded]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded
 *
 * @category Utilities
 * @param request  HTTP request.
 * @param forwardingPolicy  A trust policy to proxy forwarding information.
 *
 * @returns Request URL.
 */
export function requestURL(
    request: IncomingMessage,
    forwardingPolicy?: ProxyForwardingTrustPolicy,
): URL {

  const forwarded = trustedForward(request, forwardingPolicy);
  const { connection, url = '', headers } = request;
  const protocol = forwarded?.proto || ((connection as TLSSocket).encrypted ? 'https' : 'http');
  const host = forwarded?.host || headers.host || connection.localAddress;

  return new URL(url, `${protocol}://${host}`);
}
