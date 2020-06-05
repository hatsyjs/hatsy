/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute } from '@hatsy/route-match';

/**
 * Request routing matters.
 *
 * @category Router
 * @typeparam TEntry  A type of route entries.
 * @typeparam TRoute  A type of route.
 */
export interface RoutingMatters<
    TEntry extends PathRoute.Entry = PathRoute.Entry,
    TRoute extends PathRoute<TEntry> = PathRoute<TEntry>,
    > {

  /**
   * A route of this request.
   */
  readonly route: TRoute;

}
