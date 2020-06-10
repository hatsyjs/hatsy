/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { simpleRoutePattern, urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { HttpMeans } from '../http';
import { RequestContext, RequestModification } from '../request-context';
import { RequestExtension } from '../request-extension';
import { requestURL } from '../util';
import { HttpRouterConfig } from './http-router-config';
import { RouterMeans } from './router-means';

export interface HttpRouterExtension<
    TInput extends HttpMeans = HttpMeans,
    TRoute extends URLRoute = URLRoute,
    >
    extends RequestExtension<TInput, RouterMeans<TRoute>> {

  with<TInput extends HttpMeans>(
      config: HttpRouterConfig.DefaultRoute<TInput>,
  ): HttpRouterExtension<TInput>;

  with<TInput extends HttpMeans, TRoute extends URLRoute>(
      config: HttpRouterConfig.CustomRoute<TInput, TRoute>,
  ): HttpRouterExtension<TInput, TRoute>;

}

/**
 * @internal
 */
function buildURLRoute<TRoute extends URLRoute>(
    { request }: HttpMeans,
    { forwardTrust }: HttpRouterConfig,
): TRoute {
  return urlRoute(requestURL(request, forwardTrust)) as TRoute;
}

/**
 * @internal
 */
class HttpRouterExtension$<
    TInput extends HttpMeans = HttpMeans,
    TRoute extends URLRoute = URLRoute,
    > extends RequestExtension<TInput, RouterMeans<TRoute>> implements HttpRouterExtension<TInput, TRoute> {

  readonly modification: (context: RequestContext<TInput>) => RequestModification<TInput, RouterMeans<TRoute>>;

  constructor(config: HttpRouterConfig<TInput, TRoute>) {
    super();

    const { routePattern = simpleRoutePattern } = config;
    const buildRoute: <TMeans extends TInput>(context: RequestContext<TMeans>) => TRoute = config.buildRoute
        ? config.buildRoute.bind(config)
        : context => buildURLRoute(context, config);

    this.modification = <TMeans extends TInput>(
        context: RequestContext<TMeans>,
    ): RequestModification<TMeans, RouterMeans<TRoute>> => {

      const route: TRoute = buildRoute(context);
      const mod: Omit<RouterMeans<TRoute>, keyof HttpMeans> = {
        fullRoute: route,
        route,
        routeMatch: noop,
        routePattern,
      };

      return mod as RequestModification<unknown, RouterMeans<TRoute>>;
    };
  }

  with<TInput extends HttpMeans>(
      config: HttpRouterConfig.DefaultRoute<TInput>,
  ): HttpRouterExtension<TInput>;

  with<TInput extends HttpMeans, TRoute extends URLRoute>(
      config: HttpRouterConfig.CustomRoute<TInput, TRoute>,
  ): HttpRouterExtension<TInput, TRoute>;

  with<TInput extends HttpMeans, TRoute extends URLRoute>(
      config: HttpRouterConfig<TInput, TRoute>,
  ): HttpRouterExtension<TInput, TRoute> {
    return new HttpRouterExtension$(config);
  }

}

export const HttpRouterMeans: HttpRouterExtension = (/*#__PURE__*/ new HttpRouterExtension$<HttpMeans, URLRoute>(
    {} as HttpRouterConfig.DefaultRoute,
));
