/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RouteCaptor, routeMatch, RouteMatcher, RoutePattern } from '@hatsy/route-match';
import { mapIt } from '@proc7ts/a-iterable';
import { isIterable, lazyValue } from '@proc7ts/primitives';
import { RequestContext, RequestModification } from '../request-context';
import { requestHandler, RequestHandler } from '../request-handler';
import { RouterMeans } from './router-means';

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
    TMeans extends RouterMeans<TRoute> = RouterMeans<TRoute>,
    > {

  /**
   * A route pattern that should match the route in order the {@link to handler} to be called.
   *
   * When specified as a string, a {@link RouterMeans.routePattern pattern parser} is used to parse it.
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
export type RouteTailExtractor<TRoute extends PathRoute, TMeans extends RouterMeans<TRoute> = RouterMeans<TRoute>> =
/**
 * @param means  Route processing means of the matching route.
 *
 * @returns  Extracted tail of the matching route.
 */
    (this: void, means: TMeans) => TRoute;

/**
 * @internal
 */
function defaultRouteTailExtractor<TRoute extends PathRoute>({ route, routeMatch }: RouterMeans<TRoute>): TRoute {

  let fromEntry: number | undefined;

  routeMatch((_type, _name, _arg, position: RouteMatcher.Position<TRoute>) => {
    if (fromEntry == null) {
      fromEntry = position.entryIndex;
    }
  });

  return fromEntry ? route.section(fromEntry) : route.section(route.path.length);
}

/**
 * @internal
 */
function routeHandlerByRule<TRoute extends PathRoute, TMeans extends RouterMeans<TRoute>>(
    rule: RoutingRule<TRoute, TMeans>,
): RequestHandler<TMeans> {

  const { on, to, tail = defaultRouteTailExtractor } = rule;

  return async (context: RequestContext<RouterMeans<TRoute> & TMeans>) => {

    const { route, routeMatch: prevMatch, routePattern, next } = context;
    const specMatch = routeMatch(
        route,
        typeof on === 'string' ? routePattern(on) : on,
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
        } as RequestModification<RouterMeans<TRoute> & TMeans>,
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
 * @param routes  Routing rules. Either a routing rule, or iterable of routing rules.
 *
 * @returns Route processing handler.
 */
export function routeHandler<TRoute extends PathRoute, TMeans extends RouterMeans<TRoute>>(
    routes: RoutingRule<TRoute, TMeans> | Iterable<RoutingRule<TRoute, TMeans>>,
): RequestHandler<TMeans> {
  return isIterable(routes)
      ? requestHandler(mapIt(routes, routeHandlerByRule))
      : routeHandlerByRule(routes);
}
