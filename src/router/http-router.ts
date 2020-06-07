/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { HttpMatters } from '../http';
import { RequestHandler } from '../request-handler';
import { ProxyForwardingTrustPolicy, requestURL } from '../util';
import { routeHandler, RouteSpec } from './route-handler';
import { RouteMatters } from './route-matters';

/**
 * Router configuration.
 *
 * @category Router
 * @typeparam TMatters  A type of supported HTTP request processing matters.
 * @typeparam TRoute  A type of supported URL route.
 */
export type RouterConfig<TMatters extends HttpMatters = HttpMatters, TRoute extends URLRoute = URLRoute> =
    | RouterConfig.DefaultRoute
    | RouterConfig.CustomRoute<TMatters, TRoute>;

export namespace RouterConfig {

  /**
   * Base router configuration.
   *
   * @typeparam TMatters  A type of supported HTTP request processing matters.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface Base {

    /**
     * A trust policy to proxy forwarding records.
     *
     * @default No trust policy. Which means the forwarding information won't be consulted.
     *
     * @see trustedForward
     */
    readonly forwardingTrust?: ProxyForwardingTrustPolicy;

  }

  /**
   * Router configuration with default route builder.
   *
   * @category Router
   * @typeparam TMatters  A type of supported HTTP request processing matters.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface DefaultRoute extends Base {

    readonly buildRoute?: undefined;

  }

  /**
   * Router configuration with custom route builder.
   *
   * @category Router
   * @typeparam TMatters  A type of supported HTTP request processing matters.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface CustomRoute<TMatters extends HttpMatters = HttpMatters, TRoute extends URLRoute = URLRoute>
      extends Base {

    /**
     * Builds a route based on HTTP request processing matters.
     *
     * @param matters  HTTP request processing matters.
     *
     * @returns New URL route.
     *
     * @default Builds a route based on {@link requestURL request URL}.
     */
    buildRoute(matters: TMatters): TRoute;

  }

}

/**
 * @internal
 */
function buildURLRoute<TRoute extends URLRoute>(
    matters: HttpMatters,
    { forwardingTrust }: RouterConfig,
): TRoute {
  return urlRoute(requestURL(matters.request, forwardingTrust)) as TRoute;
}

/**
 * Builds HTTP router with URL route.
 *
 * The router is an HTTP request processing handler that builds {@link RouteMatters route matters} and delegates
 * to matching route handlers.
 *
 * @category Router
 * @param routes  Either route handler specifier, or iterable of route handler specifiers.
 * @param config  Router configuration.
 *
 * @returns HTTP request processing handler.
 */
export function httpRouter<TMatters extends HttpMatters, TRoute extends URLRoute>(
    routes: RouteSpec<TMatters, TRoute> | Iterable<RouteSpec<TMatters, TRoute>>,
    config?: RouterConfig.DefaultRoute,
): RequestHandler<TMatters>;

/**
 * Builds HTTP router with custom route.
 *
 * The router is an HTTP request processing handler that builds {@link RouteMatters route matters} and delegates
 * to matching route handlers.
 *
 * @param routes  Either route handler specifier, or iterable of route handler specifiers.
 * @param config  Router configuration.
 *
 * @returns HTTP request processing handler.
 */
export function httpRouter<TMatters extends HttpMatters, TRoute extends URLRoute>(
    routes: RouteSpec<TMatters, TRoute> | Iterable<RouteSpec<TMatters, TRoute>>,
    config: RouterConfig.CustomRoute<TMatters, TRoute>,
): RequestHandler<TMatters>;

export function httpRouter<TMatters extends HttpMatters, TRoute extends URLRoute>(
    routes: RouteSpec<TMatters, TRoute> | Iterable<RouteSpec<TMatters, TRoute>>,
    config: RouterConfig<TMatters, TRoute> = {},
): RequestHandler<TMatters> {
  return async context => {
    await context.next(
        routeHandler(routes),
        {
          route: config.buildRoute ? config.buildRoute(context) : buildURLRoute(context, config),
          match: noop,
        } as RouteMatters<TRoute> & Partial<unknown>,
    );
  };
}
