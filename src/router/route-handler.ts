/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RouteCaptor, routeMatch, RouteMatcher, RoutePattern, routeTail } from '@hatsy/route-match';
import { mapIt } from '@proc7ts/a-iterable';
import { isIterable, lazyValue } from '@proc7ts/primitives';
import { RequestContext, RequestModifications } from '../request-context';
import { requestHandler, RequestHandler } from '../request-handler';
import { RouteMeans } from './route-means';

/**
 * Routing configuration.
 *
 * @category Router
 * @typeparam TRoute  A type of supported URL route.
 * @typeparam TMeans  A type of supported route processing means.
 */
export interface RoutingConfig<TRoute extends PathRoute, TMeans extends RouteMeans<TRoute>> {

  /**
   * Either a route processing handler, a routing rule, or iterable of the above.
   */
  routes:
      | RequestHandler<TMeans>
      | RoutingRule<TRoute, TMeans>
      | Iterable<RequestHandler<TMeans> | RoutingRule<TRoute, TMeans>>,

}

/**
 * Routing rule.
 *
 * Declares a route handler to delegate request processing to when the route matches target {@link on pattern}.
 *
 * @category Router
 * @typeparam TRoute  A type of matching route.
 * @typeparam TMeans  A type of route processing means.
 */
export interface RoutingRule<
    TRoute extends PathRoute = PathRoute,
    TMeans extends RouteMeans<TRoute> = RouteMeans<TRoute>,
    > {

  /**
   * A route pattern that should match the route in order the {@link to handler} to be called.
   *
   * When specified as a string, a {@link RouteMeans.routePattern pattern parser} is used to parse it.
   */
  readonly on: RoutePattern<TRoute> | string;

  /**
   * A route handler to call when the route matches the pattern.
   *
   * This handler would receive a [[tail]] of the matching route.
   */
  readonly to: RequestHandler<TMeans>,

  /**
   * Matching route tail extractor.
   *
   * The extracted route tail is passed to the {@link to handler}.
   *
   * @default Extracts a matching route tail starting from the first capture/wildcard.
   */
  readonly tail?: RouteTailExtractor<TRoute, TMeans>;

}

/**
 * Matching route tail extractor.
 *
 * @category Router
 * @typeparam TRoute  A type of matching route.
 * @typeparam TMeans  A type of route processing means.
 */
export type RouteTailExtractor<TRoute extends PathRoute, TMeans extends RouteMeans<TRoute> = RouteMeans<TRoute>> =
/**
 * @param means  Route processing means of the matching route.
 *
 * @returns  Extracted tail of the matching route.
 */
    (this: void, means: TMeans) => TRoute;

/**
 * @internal
 */
function defaultRouteTailExtractor<TRoute extends PathRoute>({ route, routeMatch }: RouteMeans<TRoute>): TRoute {

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
function routeHandlerByRule<TRoute extends PathRoute, TMeans extends RouteMeans<TRoute>>(
    rule: RequestHandler<TMeans> | RoutingRule<TRoute, TMeans>,
): RequestHandler<TMeans> {
  if (typeof rule === 'function') {
    return rule;
  }

  const { on, to, tail = defaultRouteTailExtractor } = rule;

  return async (context: RequestContext<RouteMeans<TRoute> & TMeans>) => {

    const { route, routeMatch: prevMatch, next } = context;
    const specMatch = routeMatch(
        route,
        typeof on === 'string' ? context.routePattern(on) : on,
    );

    if (!specMatch) {
      return;
    }

    const getTail = lazyValue(() => tail({ ...context, routeMatch: specMatch }));

    await next(
        to,
        {
          get route() {
            return getTail();
          },
          routeMatch(captor: RouteCaptor<TRoute>): void {
            prevMatch(captor);
            specMatch(captor);
          },
        } as RequestModifications<RouteMeans<TRoute> & TMeans>,
    );
  };
}

/**
 * Builds a route processing handler that delegates to route handlers accordingly to routing configuration.
 *
 * Selects the first matching route and delegates request processing to its handler. If the handler not responded,
 * then tries the next matching route and so on, until responded or no routes left.
 *
 * @category Router
 * @typeparam TRoute  A type of supported route.
 * @typeparam TMeans  A type of route processing means.
 * @param config  Routing configuration.
 *
 * @returns Route processing handler.
 */
export function routeHandler<TRoute extends PathRoute, TMeans extends RouteMeans<TRoute>>(
    config: RoutingConfig<TRoute, TMeans>,
): RequestHandler<TMeans> {

  const { routes } = config;

  return isIterable(routes)
      ? requestHandler(mapIt(routes, routeHandlerByRule))
      : routeHandlerByRule(routes);
}
