/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RouteMatch, RoutePattern } from '@hatsy/route-match';

/**
 * Matters of request that matches a route pattern.
 *
 * @category Router
 * @typeparam TRoute  A type of route.
 */
export interface RouteMatters<TRoute extends PathRoute = PathRoute> {

  /**
   * Matching route.
   */
  readonly route: TRoute;

  /**
   * A successful match of the route(s) against pattern(s).
   */
  readonly routeMatch: RouteMatch<TRoute>;

  /**
   * A parser of route pattern string.
   */
  routePattern(pattern: string): RoutePattern<TRoute>;

}
