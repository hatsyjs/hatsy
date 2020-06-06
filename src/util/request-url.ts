/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { IncomingMessage } from 'http';
import { TLSSocket } from 'tls';
import { ProxyForwardingTrustPolicy, trustedForwarded } from './trusted-forwarded';

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

  const forwarded = trustedForwarded(request, forwardingPolicy);
  const { connection, url, headers } = request;
  const protocol = forwarded?.p.proto.v || ((connection as TLSSocket).encrypted ? 'https' : 'http');
  const host = forwarded?.p.host.v || headers.host || connection.localAddress;

  return new URL(`${protocol}://${host}`, url);
}
