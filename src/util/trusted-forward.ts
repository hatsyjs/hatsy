/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { hthvFlatten, HthvItems, hthvParse } from '@hatsy/http-header-value';
import { IncomingMessage } from 'http';

/**
 * A trust policy to proxy forwarding records.
 *
 * Defines how to treat proxy forwarding information contained in request headers.
 *
 * @category Utilities
 */
export interface ProxyForwardingTrustPolicy {

  /**
   * Whether to trust forwarding records in `Forwarded` HTTP request header.
   *
   * When this information is trusted, the host and protocol in request header is used as a request one.
   *
   * Either a boolean flag, or a list of trusted proxies. The latter can be either a string (trusted `by` attribute),
   * or a tuple consisting of attribute name and value (e.g. `['secret', 'some_secret_hash']`).
   *
   * @default `false`, which means the `Forwarded` header won't be parsed.
   */
  readonly trustForwarded?: boolean | readonly (string | [string, string])[];

}

/**
 * Proxy forwarding info.
 *
 * Corresponds to parameters of [Forwarded] header.
 *
 * [Forwarded]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded
 *
 * @category Utilities
 */
export interface ProxyForward {

  readonly by?: string;
  readonly for?: string;
  readonly host?: string;
  readonly proto?: string;
  readonly [key: string]: string | undefined;

}

/**
 * @internal
 */
function proxyForwardByHeaderItems(items: HthvItems): ProxyForward {

  const result: Record<string, string> = {};

  for (const { n, v } of items.list) {
    if (n) {
      result[n] = v;
    }
  }

  return result;
}

/**
 * Extracts a proxy forwarding info from the given HTTP request accordingly to the give trust policy.
 *
 * The forwarding information is extracted from [Forwarded] header.
 *
 * [Forwarded]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded
 *
 * @category Utilities
 * @param request  Source HTTP request.
 * @param forwardingTrust  A trust policy to proxy forwarding records.
 *
 * @returns Proxy forwarding info extracted from trusted record of `Forwarded` header value, or `undefined`
 * when either `Forwarded` header is missing, or does not contain trusted records.
 */
export function trustedForward(
    request: IncomingMessage,
    forwardingTrust: ProxyForwardingTrustPolicy = {},
): ProxyForward | undefined {

  const { trustForwarded = false } = forwardingTrust;

  if (!trustForwarded) {
    return;
  }
  const { forwarded } = request.headers;

  if (!forwarded) {
    return;
  }

  for (const rawRecord of hthvParse(forwarded)) {

    const items = hthvFlatten([rawRecord]);

    if (trustForwarded === true) {
      return proxyForwardByHeaderItems(items);
    }
    for (const policy of trustForwarded) {
      if (typeof policy === 'string' ? items.map.by.v === policy : items.map[policy[0]].v === policy[1]) {
        return proxyForwardByHeaderItems(items);
      }
    }
  }

  return;
}
