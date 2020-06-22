/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { HttpForwardTrust } from '@hatsy/http-header-value/headers';
import { HttpAddressRep } from '@hatsy/http-header-value/node';
import { lazyValue } from '@proc7ts/primitives';
import {
  RequestCapability,
  RequestContext,
  RequestModification,
  RequestModifier__symbol,
  requestUpdate,
} from '../../core';
import { HttpMeans } from '../http.means';

/**
 * HTTP proxy forwarding capability.
 *
 * Extracts trusted forwarding information from HTTP request and updates {@link HttpMeans.requestAddresses HTTP request
 * addressing info} accordingly.
 *
 * The proxy forwarding information is not trusted by default.
 */
export interface HttpForwarding extends RequestCapability<HttpMeans> {

  /**
   * Configures trust policy to proxy forwarding records.
   *
   * @param trust  New trust policy to HTTP proxy forwarding records.
   *
   * @returns New HTTP proxy forwarding capability.
   */
  with(trust: HttpForwardTrust): HttpForwarding;

}

/**
 * @internal
 */
class HttpForwardingCapability extends RequestCapability<HttpMeans> implements HttpForwarding {

  constructor(private readonly _trust: HttpForwardTrust) {
    super();
  }

  get [RequestModifier__symbol](): HttpForwarding {
    return HttpForwarding; // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  with(trust: HttpForwardTrust): HttpForwarding {
    return new HttpForwardingCapability(trust);
  }

  modification<TMeans extends HttpMeans>({ request }: RequestContext<TMeans>): RequestModification<TMeans> {

    const addresses = lazyValue(() => HttpAddressRep.by(request, this._trust));

    return requestUpdate<HttpMeans>({
      requestAddresses: {
        get url() {
          return addresses().url;
        },
        get ip() {
          return addresses().ip;
        },
      },
    });
  }

}

/**
 * HTTP proxy forwarding capability.
 *
 * Can be used directly, or {@link HttpForwarding.with configured} first.
 */
export const HttpForwarding: HttpForwarding = (/*#__PURE__*/ new HttpForwardingCapability({}));
