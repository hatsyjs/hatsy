/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RoutePattern, simpleRoutePattern, urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { HttpMeans } from '../http';
import { RequestHandler } from '../request-handler';
import { ProxyForwardTrust, requestURL } from '../util';
import { routeHandler, RouteSpec } from './route-handler';
import { RouteMeans } from './route-means';

/**
 * Router configuration.
 *
 * @category Router
 * @typeparam TMeans  A type of incoming HTTP request processing means.
 * @typeparam TRoute  A type of supported URL route.
 */
export type HttpRouterConfig<TMeans extends HttpMeans = HttpMeans, TRoute extends URLRoute = URLRoute> =
    | HttpRouterConfig.DefaultRoute
    | HttpRouterConfig.CustomRoute<TMeans, TRoute>;

export namespace HttpRouterConfig {

  /**
   * Base router configuration.
   *
   * @typeparam TMeans  A type of incoming HTTP request processing means.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface Base<TMeans extends HttpMeans = HttpMeans, TRoute extends URLRoute = URLRoute> {

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
     * The `this` parameter is bound to current request processing means.
     *
     * @param pattern  Pattern string in supported format.
     *
     * @default Supports patterns in simple format (`simpleRoutePattern()`).
     */
    routePattern?(this: TMeans & RouteMeans<TRoute>, pattern: string): RoutePattern<TRoute>;

  }

  /**
   * Router configuration with default route builder.
   *
   * @category Router
   */
  export interface DefaultRoute extends Base {

    readonly buildRoute?: undefined;

  }

  /**
   * Router configuration with custom route builder.
   *
   * @category Router
   * @typeparam TMeans  A type of incoming HTTP request processing means.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface CustomRoute<TMeans extends HttpMeans = HttpMeans, TRoute extends URLRoute = URLRoute>
      extends Base {

    /**
     * Builds a route based on HTTP request processing means.
     *
     * @param means  HTTP request processing means.
     *
     * @returns New URL route.
     *
     * @default Builds a route based on {@link requestURL request URL}.
     */
    buildRoute(means: TMeans): TRoute;

  }

}

/**
 * @internal
 */
function buildURLRoute<TRoute extends URLRoute>(
    { request }: HttpMeans,
    { forwardTrust }: HttpRouterConfig,
): TRoute {
  return urlRoute(requestURL(request, forwardTrust)) as TRoute;
}

/**
 * Builds HTTP router with URL route.
 *
 * The router is an HTTP request processing handler that builds {@link RouteMeans route processing means} and delegates
 * to matching route handler(s).
 *
 * @category Router
 * @typeparam TMeans  A type of incoming HTTP request processing means.
 * @typeparam TRoute  A type of supported route.
 * @param routes  Either route handler specifier, or iterable of route handler specifiers.
 * @param config  Router configuration.
 *
 * @returns HTTP request processing handler.
 */
export function httpRouter<TMeans extends HttpMeans, TRoute extends URLRoute>(
    routes: RouteSpec<TRoute, TMeans & RouteMeans<TRoute>> | Iterable<RouteSpec<TRoute, TMeans & RouteMeans<TRoute>>>,
    config?: HttpRouterConfig.DefaultRoute,
): RequestHandler<TMeans>;

/**
 * Builds HTTP router with custom route.
 *
 * The router is an HTTP request processing handler that builds {@link RouteMeans route processing means} and delegates
 * to matching route handlers.
 *
 * @param routes  Either route handler specifier, or iterable of route handler specifiers.
 * @param config  Router configuration.
 *
 * @returns HTTP request processing handler.
 */
export function httpRouter<TMeans extends HttpMeans, TRoute extends URLRoute>(
    routes: RouteSpec<TRoute, TMeans & RouteMeans<TRoute>> | Iterable<RouteSpec<TRoute, TMeans & RouteMeans<TRoute>>>,
    config: HttpRouterConfig.CustomRoute<TMeans, TRoute>,
): RequestHandler<TMeans>;

export function httpRouter<TMeans extends HttpMeans, TRoute extends URLRoute>(
    routes: RouteSpec<TRoute, TMeans & RouteMeans<TRoute>> | Iterable<RouteSpec<TRoute, TMeans & RouteMeans<TRoute>>>,
    config: HttpRouterConfig<TMeans, TRoute> = {},
): RequestHandler<TMeans> {

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
        } as RouteMeans<TRoute> & Partial<unknown>,
    );
  };
}
