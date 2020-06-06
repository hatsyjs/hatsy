import { urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { HttpMatters } from '../http';
import { RequestHandler } from '../request-handler';
import { requestURL } from '../util';
import { routeHandler, RouteHandler, RouteSpec } from './route-handler';
import { RouteMatters } from './route-matters';

/**
 * @internal
 */
function buildURLRoute<TRoute extends URLRoute>(matters: object): TRoute {
  return urlRoute(requestURL((matters as HttpMatters).request)) as TRoute;
}

export function router<TMatters extends HttpMatters>(
    ...routes: RouteSpec<TMatters>[]
): RouteHandler<TMatters, URLRoute>;

export function router<TMatters, TRoute extends URLRoute>(
    buildRoute: (this: void, matters: TMatters) => TRoute,
    ...routes: RouteSpec<TMatters, TRoute>[]
): RouteHandler<TMatters, TRoute>;

export function router<TMatters, TRoute extends URLRoute>(
    buildRoute: ((matters: TMatters) => TRoute) | RouteSpec<TMatters, TRoute>,
    ...routes: RouteSpec<TMatters, TRoute>[]
): RequestHandler<TMatters> {
  return async context => {
    await context.next(
        typeof buildRoute === 'function'
            ? routeHandler(...routes)
            : routeHandler(buildRoute, ...routes),
        {
          route: typeof buildRoute === 'function' ? buildRoute(context) : buildURLRoute(context),
          match: noop,
        } as RouteMatters<TRoute> & Partial<unknown>,
    );
  };
}
