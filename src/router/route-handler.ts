/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RouteCaptor, routeMatch, RouteMatcher, RoutePattern, routeTail } from '@hatsy/route-match';
import { mapIt } from '@proc7ts/a-iterable';
import { isIterable } from '@proc7ts/primitives';
import { RequestContext } from '../request-context';
import { requestHandler, RequestHandler } from '../request-handler';
import { RouteMatters } from './route-matters';

/**
 * Request route handler signature.
 *
 * Accepts a {@link RequestContext request processing context} containing {@link RouteMatters request routing matters}
 * used to respond or to delegate to another handler.
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RouteMatters request
 * routing} ones.
 * @typeparam TRoute  A type of supported route.
 */
export type RouteHandler<TMatters, TRoute extends PathRoute = PathRoute> =
    RequestHandler<RouteMatters<TRoute> & TMatters>;

/**
 * A specifier of route handler to delegate request processing to when it matches the given
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RouteMatters request
 * route} ones.
 * @typeparam TRoute  A type of matching route.
 */
export interface RouteSpec<TMatters, TRoute extends PathRoute = PathRoute> {

  /**
   * A route pattern that should match the route in order the {@link to handler} to be called.
   *
   * When specified as a string, a {@link RouteMatters.routePattern pattern parser} is used to parse it.
   */
  readonly on: RoutePattern<TRoute> | string;

  /**
   * A route handler to call when the route matches the pattern.
   */
  readonly to: RouteHandler<TMatters, TRoute>,

  /**
   * Matching route tail extractor.
   *
   * The extracted route tail is passed to the {@link to handler}.
   *
   * @default Extracts a matching route tail starting from the first capture/wildcard.
   */
  readonly tail?: RouteTailExtractor<TMatters, TRoute>;

}

/**
 * Matching route tail extractor.
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RouteMatters request
 * route} ones.
 * @typeparam TRoute  A type of matching route.
 * @param matters  Request processing matters of the matching route.
 *
 * @returns  Extracted tail of the matching route.
 */
export type RouteTailExtractor<TMatters, TRoute extends PathRoute> = (
    this: void,
    matters: RouteMatters<TRoute> & TMatters,
) => TRoute;

/**
 * @internal
 */
function defaultRouteTailExtractor<TRoute extends PathRoute>({ route, routeMatch }: RouteMatters<TRoute>): TRoute {

  let fromEntry: number | undefined;

  routeMatch((_type, _name, _arg, position: RouteMatcher.Position<TRoute>) => {
    if (fromEntry == null) {
      fromEntry = position.entryIndex;
    }
  });

  return fromEntry ? routeTail(route, fromEntry) : route;
}

/**
 * @internal
 */
function routeHandlerBySpec<TMatters, TRoute extends PathRoute>(
    { on, to, tail = defaultRouteTailExtractor }: RouteSpec<TMatters, TRoute>,
): RouteHandler<TMatters, TRoute> {
  return async (context: RequestContext<RouteMatters<TRoute> & TMatters>) => {

    const { route, routeMatch: prevMatch, next } = context;
    const specMatch = routeMatch(
        route,
        typeof on === 'string' ? context.routePattern(on) : on,
    );

    if (!specMatch) {
      return;
    }

    let extractedTail: TRoute | undefined;

    await next(
        to,
        {
          get route() {
            return extractedTail || (extractedTail = tail({ ...context, routeMatch: specMatch }));
          },
          routeMatch(captor: RouteCaptor<TRoute>): void {
            prevMatch(captor);
            specMatch(captor);
          },
        } as RequestContext.Modifications<RouteMatters<TRoute> & TMatters>,
    );
  };
}

/**
 * Builds a request route handler that delegates to matching route handlers.
 *
 * Selects the first matching route and delegates request processing to its handler. If the handler not responded,
 * then tries the next matching route and so on, until responded or no routes left.
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RouteMatters request
 * route} ones.
 * @typeparam TRoute  A type of supported route.
 * @param routes  Either route handler specifier, or iterable of route handler specifiers.
 *
 * @returns Request route handler.
 */
export function routeHandler<TMatters, TRoute extends PathRoute = PathRoute>(
    routes: RouteSpec<TMatters, TRoute> | Iterable<RouteSpec<TMatters, TRoute>>,
): RouteHandler<TMatters, TRoute> {
  return isIterable(routes)
      ? requestHandler(mapIt(routes, routeHandlerBySpec))
      : routeHandlerBySpec(routes);
}
