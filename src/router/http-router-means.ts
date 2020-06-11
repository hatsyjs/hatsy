/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RoutePattern, simpleRoutePattern, urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { RequestContext, RequestExtension, RequestModification } from '../core';
import { HttpMeans } from '../http';
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

  readonly modification: <TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ) => RequestModification<TMeans, RouterMeans<TRoute>>;

  private readonly _routePattern: (
      this: void,
      pattern: string,
      context: RequestContext<TInput & RouterMeans<TRoute>>,
  ) => RoutePattern<TRoute>;

  constructor(config: HttpRouterConfig<TInput, TRoute>) {
    super();

    const routePattern = this._routePattern = config.routePattern
        ? config.routePattern.bind(config)
        : simpleRoutePattern;

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
        routePattern(pattern) {
          return routePattern(
              pattern,
              this as RequestContext<any>,
          );
        },
      };

      return mod as RequestModification<unknown, RouterMeans<TRoute>>;
    };
  }

  modify<TNext>(
      context: RequestContext<TInput & RouterMeans<TRoute>>,
      modification: RequestModification<TInput & RouterMeans<TRoute>, TNext>,
  ): RequestModification<TInput & RouterMeans<TRoute>, TNext> {
    if (modification.routePattern) {
      return modification;
    }
    return {
      ...modification,
      routePattern: pattern => this._routePattern(pattern, context),
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
