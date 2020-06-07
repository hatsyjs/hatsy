/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RoutePattern, simpleRoutePattern, urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { HttpMatters } from '../http';
import { RequestHandler } from '../request-handler';
import { ProxyForwardTrust, requestURL } from '../util';
import { routeHandler, RouteSpec } from './route-handler';
import { RouteMatters } from './route-matters';

/**
 * Router configuration.
 *
 * @category Router
 * @typeparam TMatters  A type of supported HTTP request processing matters.
 * @typeparam TRoute  A type of supported URL route.
 */
export type HttpRouterConfig<TMatters extends HttpMatters = HttpMatters, TRoute extends URLRoute = URLRoute> =
    | HttpRouterConfig.DefaultRoute
    | HttpRouterConfig.CustomRoute<TMatters, TRoute>;

export namespace HttpRouterConfig {

  /**
   * Base router configuration.
   *
   * @typeparam TMatters  A type of supported HTTP request processing matters.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface Base<TMatters extends HttpMatters = HttpMatters, TRoute extends URLRoute = URLRoute> {

    /**
     * A trust policy to proxy forwarding records.
     *
     * @default No trust policy. Which means the forwarding information won't be consulted.
     *
     * @see trustedForward
     */
    readonly forwardTrust?: ProxyForwardTrust;

    /**
     * A parser of route pattern string.
     *
     * The `this` parameter is bound to current request processing matters.
     *
     * @param pattern  Pattern string in supported format.
     *
     * @default Supports patterns in simple format (`simpleRoutePattern()`).
     */
    routePattern?(this: TMatters & RouteMatters<TRoute>, pattern: string): RoutePattern<TRoute>;

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
    { forwardTrust }: HttpRouterConfig,
): TRoute {
  return urlRoute(requestURL(matters.request, forwardTrust)) as TRoute;
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
    config?: HttpRouterConfig.DefaultRoute,
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
    config: HttpRouterConfig.CustomRoute<TMatters, TRoute>,
): RequestHandler<TMatters>;

export function httpRouter<TMatters extends HttpMatters, TRoute extends URLRoute>(
    routes: RouteSpec<TMatters, TRoute> | Iterable<RouteSpec<TMatters, TRoute>>,
    config: HttpRouterConfig<TMatters, TRoute> = {},
): RequestHandler<TMatters> {

  const { routePattern = simpleRoutePattern } = config;

  return async context => {

    const route: TRoute = config.buildRoute ? config.buildRoute(context) : buildURLRoute(context, config);

    await context.next(
        routeHandler(routes),
        {
          fullRoute: route,
          route,
          routeMatch: noop,
          routePattern,
        } as RouteMatters<TRoute> & Partial<unknown>,
    );
  };
}
