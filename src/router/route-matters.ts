/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RouteMatch } from '@hatsy/route-match';

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
   * A successful match of the route against pattern.
   */
  readonly match: RouteMatch<TRoute>;

}
