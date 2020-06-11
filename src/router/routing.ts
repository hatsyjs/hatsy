/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { PathRoute, RoutePattern, simpleRoutePattern, urlRoute, URLRoute } from '@hatsy/route-match';
import { noop } from '@proc7ts/primitives';
import { RequestCapability, RequestContext, RequestModification } from '../core';
import { HttpMeans } from '../http';
import { requestURL } from '../util';
import { RouterConfig } from './router-config';
import { RouterMeans } from './router-means';

/**
 * Request routing capability.
 *
 * Provides {@link RouterMeans request routing means} for handlers.
 *
 * @category Router
 * @typeparam TInput  A type of request processing means required in order to apply this capability.
 * @typeparam TRoute  Supported route type.
 */
export interface Routing<TInput = HttpMeans, TRoute extends PathRoute = URLRoute>
    extends RequestCapability<TInput, RouterMeans<TRoute>> {

  /**
   * Configures routing capability that constructs a route by incoming HTTP request.
   *
   * @param config  Router configuration without route build.
   *
   * @returns New request routing capability.
   */
  with<TInput extends HttpMeans>(
      config: RouterConfig.DefaultRoute<TInput>,
  ): Routing<TInput>;

  /**
   * Configures routing capability with custom route builder.
   *
   * @param config  Route configuration with custom route builder.
   *
   * @returns New request routing capability.
   */
  with<TInput, TRoute extends PathRoute>(
      config: RouterConfig.CustomRoute<TInput, TRoute>,
  ): Routing<TInput, TRoute>;

}

/**
 * @internal
 */
function buildURLRoute<TMeans, TRoute extends PathRoute>(
    context: RequestContext<TMeans>,
    { forwardTrust }: RouterConfig<TMeans, TRoute>,
): TRoute {

  const { request } = context as unknown as HttpMeans;

  return urlRoute(requestURL(request, forwardTrust)) as unknown as TRoute;
}

/**
 * @internal
 */
class RoutingCapability<TInput, TRoute extends PathRoute>
    extends RequestCapability<TInput, RouterMeans<TRoute>>
    implements Routing<TInput, TRoute> {

  readonly modification: <TMeans extends TInput>(
      context: RequestContext<TMeans>,
  ) => RequestModification<TMeans, RouterMeans<TRoute>>;

  private readonly _routePattern: (
      this: void,
      pattern: string,
      context: RequestContext<TInput & RouterMeans<TRoute>>,
  ) => RoutePattern<TRoute>;

  constructor(config: RouterConfig<TInput, TRoute>) {
    super();

    const routePattern = this._routePattern = config.routePattern
        ? config.routePattern.bind(config)
        : simpleRoutePattern;
    const buildRoute: (context: RequestContext<TInput>) => TRoute = config.buildRoute
        ? config.buildRoute.bind(config)
        : context => buildURLRoute(context, config);

    this.modification = <TMeans extends TInput>(
        context: RequestContext<TMeans>,
    ): RequestModification<TMeans, RouterMeans<TRoute>> => {

      const route: TRoute = buildRoute(context as RequestContext<TInput>);
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
      config: RouterConfig.DefaultRoute<TInput>,
  ): Routing<TInput>;

  with<TInput extends HttpMeans, TRoute extends URLRoute>(
      config: RouterConfig.CustomRoute<TInput, TRoute>,
  ): Routing<TInput, TRoute>;

  with<TInput extends HttpMeans, TRoute extends URLRoute>(
      config: RouterConfig<TInput, TRoute>,
  ): Routing<TInput, TRoute> {
    return new RoutingCapability(config);
  }

}

/**
 * Request routing capability instance.
 *
 * Can be used directly (for HTTP requests), or {@link Routing.with configured} first.
 *
 * @category Router
 */
export const Routing: Routing = (/*#__PURE__*/ new RoutingCapability<HttpMeans, URLRoute>(
    {} as RouterConfig.DefaultRoute,
));
