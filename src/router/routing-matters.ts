/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute } from '@hatsy/route-match';

/**
 * Request routing matters.
 *
 * @category Router
 * @typeparam TRoute  A type of route.
 */
export interface RoutingMatters<TRoute extends PathRoute = PathRoute> {

  /**
   * A route of this request.
   */
  readonly route: TRoute;

}
