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
 * This is a tuple consisting of:
 * - a route pattern to match the route against to call the handler,
 * - a route handler to call when the route matches the pattern, and
 * - optionally a matching route tail extractor function. The extracted route tail is passed to the handler.
 *
 * If route tail extractor is not specified, the route tail is extracted starting from the first match in the pattern.
 *
 * @category Router
 * @typeparam TMatters  A type of request processing matters required in addition to {@link RouteMatters request
 * route} ones.
 * @typeparam TRoute  A type of matching route.
 */
export type RouteSpec<TMatters, TRoute extends PathRoute = PathRoute> = readonly [
  RoutePattern<TRoute>,
  RouteHandler<TMatters, TRoute>,
  RouteTailExtractor<TMatters, TRoute>?
];

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
function defaultRouteTailExtractor<TRoute extends PathRoute>({ route, match }: RouteMatters<TRoute>): TRoute {

  let fromEntry: number | undefined;

  match((_type, _name, _arg, position: RouteMatcher.Position<TRoute>) => {
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
    [pattern, handler, extractTail = defaultRouteTailExtractor]: RouteSpec<TMatters, TRoute>,
): RouteHandler<TMatters, TRoute> {
  return async (context: RequestContext<RouteMatters<TRoute> & TMatters>) => {

    const { route, match, next } = context;
    const specMatch = routeMatch(route, pattern);

    if (!specMatch) {
      return;
    }

    let tail: TRoute | undefined;

    await next(
        handler,
        {
          get route() {
            return tail || (tail = extractTail({ ...context, match: specMatch }));
          },
          match(captor: RouteCaptor<TRoute>): void {
            match(captor);
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
  if (isIterable<RouteSpec<TMatters, TRoute>>(routes)) {
    return requestHandler(mapIt(routes, routeHandlerBySpec));
  }
  return routeHandlerBySpec(routes);
}
