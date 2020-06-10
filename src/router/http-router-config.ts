/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RoutePattern, URLRoute } from '@hatsy/route-match';
import { HttpMeans } from '../http';
import { RequestContext } from '../request-context';
import { ProxyForwardTrust } from '../util';
import { RouterMeans } from './router-means';

/**
 * HTTP router configuration.
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
     * @param context  Current request processing context.
     *
     * @default Supports patterns in simple format (`simpleRoutePattern()`).
     */
    routePattern?(pattern: string, context: RequestContext<TMeans & RouterMeans<TRoute>>): RoutePattern<TRoute>;

  }

  /**
   * Router configuration with default route builder.
   *
   * @category Router
   * @typeparam TMeans  A type of incoming HTTP request processing means.
   * @typeparam TRoute  A type of supported URL route.
   */
  export interface DefaultRoute<TMeans extends HttpMeans = HttpMeans> extends Base<TMeans> {

    readonly buildRoute?: undefined;

  }

  /**
   * Router configuration with custom route builder.
   *
   * @category Router
   * @typeparam TMeans  A type of incoming HTTP request processing means.
   */
  export interface CustomRoute<TMeans extends HttpMeans = HttpMeans, TRoute extends URLRoute = URLRoute>
      extends Base<TMeans, TRoute> {

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
