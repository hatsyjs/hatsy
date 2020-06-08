/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute } from '@hatsy/route-match';
import { RequestModifications } from '../request-context';
import { RequestHandler } from '../request-handler';
import { RouteMeans } from './route-means';

/**
 * Builds a route processing handler that maps the first route entry of the path to corresponding handler.
 *
 * The matching route handler receives a route tail without first entry.
 *
 * @category Router
 * @param mapping  A mapping of routers with matching route entry names as keys.
 *
 * @returns New route processing handler.
 */
export function routeMapper<TRoute extends PathRoute, TMeans extends RouteMeans<TRoute>>(
    mapping: { readonly [entry: string]: RequestHandler<TMeans> },
): RequestHandler<TMeans> {
  return async ({ route, next }) => {

    const { path: [firstEntry] } = route;

    if (firstEntry) {

      const handler = mapping[firstEntry.name];

      if (handler) {
        await next(
            handler,
            {
              route: route.section(1),
            } as RequestModifications<TMeans>,
        );
      }
    }
  };
}
