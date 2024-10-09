import type { RequestHandler } from './request-handler.js';

/**
 * Request processing capability.
 *
 * Modifies request processing context in a certain way when delegates to handler.
 *
 * Request processing capabilities could be {@link RequestCapability.combine combined}.
 *
 * @typeParam TInput - A type of request processing means required in order to apply this capability.
 * @typeParam TExt - A type of extension to request processing means this capability applies.
 */
export abstract class RequestCapability<TInput, TExt = object> {
  /**
   * Builds request capability by the given `provider`.
   *
   * @typeParam TInput - A type of request processing means required by this provider.
   * @typeParam TExt - A type of extension to request processing means this provider applies.
   * @param provider - Request processing capability provider.
   *
   * @returns Request processing capability that call the given `provider` in order to apply.
   */
  static of<TInput, TExt>(
    this: void,
    provider: RequestCapability.Provider<TInput, TExt>,
  ): RequestCapability<TInput, TExt> {
    const capability: RequestCapability<TInput, TExt> = {
      for: provider,
      and<TNext>(
        next: RequestCapability<TInput & TExt, TNext>,
      ): RequestCapability<TInput, TExt & TNext> {
        return RequestCapability.combine(capability, next);
      },
    };

    return capability;
  }

  /**
   * Combines two request processing capabilities.
   *
   * @typeParam TInput - A type of request processing means expected by the `first` capability.
   * @typeParam TExt - A type of request processing means extension applied by the `first` capability.
   * @typeParam TNext - A type of request processing means extension applied by the `second` capability.
   * @param first - First capability to combine.
   * @param second - Second capability to combine. Receives requests modified by the `first` one.
   *
   * @return Combined request processing capability that applies modifications to request by the `first` capability,
   * and then - by the `second` one.
   */
  static combine<TInput, TExt, TNext>(
    this: void,
    first: RequestCapability<TInput, TExt>,
    second: RequestCapability<TInput & TExt, TNext>,
  ): RequestCapability<TInput, TExt & TNext> {
    const chain: RequestCapability<TInput, TExt & TNext> = {
      for<TMeans extends TInput>(
        delegate: RequestHandler<TMeans & TExt & TNext>,
      ): RequestHandler<TMeans> {
        return first.for(second.for(delegate));
      },

      and<T>(
        next: RequestCapability<TInput & TExt & TNext, T>,
      ): RequestCapability<TInput, TExt & TNext & T> {
        return RequestCapability.combine<TInput, TExt & TNext, T>(chain, next);
      },
    };

    return chain;
  }

  /**
   * Provides request processing capability to the given handler.
   *
   * Builds request processing handler that modifies request and delegates to target `handler`.
   *
   * @typeParam TMeans - A type of request processing means expected by constructed handler.
   * @param handler - Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
  abstract for<TMeans extends TInput>(
    handler: RequestHandler<TMeans & TExt>,
  ): RequestHandler<TMeans>;

  /**
   * Combines this capability with the `next` one.
   *
   * @typeParam TNext - A type of extension to request processing means applied by `next` capability.
   * @param next - Next capability that receives requests modified by this capability.
   *
   * @return New request processing capability that applies modifications to request by this capability first,
   * and then - by the `next` one.
   *
   * @see RequestCapability.combine
   */
  and<TNext>(
    next: RequestCapability<TInput & TExt, TNext>,
  ): RequestCapability<TInput, TExt & TNext> {
    return RequestCapability.combine<TInput, TExt, TNext>(this, next);
  }
}

export namespace RequestCapability {
  /**
   * Request processing capability provider signature.
   *
   * Builds a request processing handler that modifies request and delegates to another one.
   *
   * @typeParam TInput - A type of request processing means required by this provider.
   * @typeParam TExt - A type of extension to request processing means this provider applies.
   * @typeParam TMeans - A type of request processing means expected by constructed handler.
   *
   * @param handler - Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
  export type Provider<TInput, TExt = object> = <TMeans extends TInput>(
    this: void,
    handler: RequestHandler<TMeans & TExt>,
  ) => RequestHandler<TMeans>;
}
