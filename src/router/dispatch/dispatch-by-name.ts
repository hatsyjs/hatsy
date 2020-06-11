/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute } from '@hatsy/route-match';
import { RequestHandler, RequestModification } from '../../core';
import { RouterMeans } from '../router-means';

/**
 * Dispatches request processing by route entry name.
 *
 * Builds a route processing handler that selects a route handler to dispatch to accordingly to the name of the first
 * route entry.
 *
 * Target route handler receives a route tail without first entry.
 *
 * @category Router
 * @param mapping  A map of handlers with matching route entry names as keys.
 *
 * @returns New route processing handler.
 */
export function dispatchByName<TRoute extends PathRoute, TMeans extends RouterMeans<TRoute>>(
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
            } as RequestModification<TMeans>,
        );
      }
    }
  };
}
