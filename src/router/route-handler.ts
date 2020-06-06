import { PathRoute } from '@hatsy/route-match';
import { RequestHandler } from '../request-handler';
import { RoutingMatters } from './routing-matters';

/**
 * Request route handler signature.
 *
 * Accepts a {@link RequestContext request processing context} containing {@link RoutingMatters request routing matters}
 * used to respond or to delegate to another handler.
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RoutingMatters request
 * routing} ones.
 * @typeparam TRoute  A type of supported route.
 */
export type RouteHandler<TMatters, TRoute extends PathRoute = PathRoute> =
    RequestHandler<RoutingMatters<TRoute> & TMatters>;
