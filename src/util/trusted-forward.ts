/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HthvItem, hthvParse } from '@hatsy/http-header-value';
import { IncomingMessage } from 'http';

/**
 * A trust policy to proxy forwarding records.
 *
 * @category Utilities
 */
export interface ProxyForwardingTrustPolicy {

  /**
   * Whether to trust forwarding records in `Forwarded` HTTP request header.
   *
   * Either a boolean flag, or a list of trusted proxies. The latter can be either a string (trusted `by` attribute),
   * or a tuple consisting of attribute name and value (e.g. `['secret', 'some_secret_hash']`).
   *
   * @default `false`, which means the `Forwarded` header won't be parsed.
   */
  readonly trustForwarded?: boolean | readonly (string | [string, string])[];

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
 * @param policy  A trust policy to proxy forwarding information.
 *
 * @returns Parsed HTTP header value item corresponding to trusted record in `Forwarded` header value, or `undefined`
 * when either `Forwarded` header is missing, or does not contain trusted records.
 */
export function trustedForward(
    request: IncomingMessage,
    policy: ProxyForwardingTrustPolicy = {},
): HthvItem | undefined {

  const { trustForwarded = false } = policy;

  if (!trustForwarded) {
    return;
  }
  const { forwarded } = request.headers;

  if (!forwarded) {
    return;
  }

  for (const record of hthvParse(forwarded)) {
    if (trustForwarded === true) {
      return record;
    }
    for (const policy of trustForwarded) {
      if (typeof policy === 'string' ? record.p.by.v === policy : record.p[policy[0]].v === policy[1]) {
        return record;
      }
    }
  }

  return;
}
