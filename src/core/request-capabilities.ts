/**
 * @packageDocumentation
 * @module @hatsy/hatsy/core
 */
import { RequestHandler } from './request-handler';

/**
 * A set of request processing capabilities.
 *
 * It is able to construct a request handler that creates request processing means for another one.
 * Thus the latter handler would receive the necessary means to utilize the provided capabilities.
 *
 * @typeparam TInput  A type of request processing means required by this capability set.
 * @typeparam TExt  A type of extension to request processing means this capability set applies.
 */
export interface RequestCapabilities<TInput, TExt = object> {

  /**
   * Provides request processing capabilities to the given handler.
   *
   * Builds request processing handler that modifies request and delegates to target `handler`.
   *
   * @typeparam TMeans  A type of request processing means expected by constructed handler.
   * @param handler  Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
  for<TMeans extends TInput>(handler: RequestHandler<TMeans & TExt>): RequestHandler<TMeans>

  /**
   * Combines this capability set with the `next` one.
   *
   * @typeparam TNext  A type of extension to request processing means applied by `next` capability set.
   * @param next  Next capability set that receives requests modified by this one.
   *
   * @return New request processing capability set that applies modifications to request by this set, and then - by
   * the `next` one.
   *
   * @see RequestCapabilities.combine
   */
  and<TNext>(next: RequestCapabilities<TInput & TExt, TNext>): RequestCapabilities<TInput, TExt & TNext>;

}

export namespace RequestCapabilities {

  /**
   * Request processing capabilities provider signature.
   *
   * Builds a request processing handler that modifies request and delegates to another one.
   *
   * @typeparam TInput  A type of request processing means required by this provider.
   * @typeparam TExt  A type of extension to request processing means this provider applies.
   */
  export type Provider<TInput, TExt = object> =
  /**
   * @typeparam TMeans  A type of request processing means expected by constructed handler.
   *
   * @param handler  Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
      <TMeans extends TInput>(
          this: void,
          handler: RequestHandler<TMeans & TExt>,
      ) => RequestHandler<TMeans>;

}

export const RequestCapabilities = {

  /**
   * Builds request capability set by the given `provider`.
   *
   * @typeparam TInput  A type of request processing means required by this provider.
   * @typeparam TExt  A type of extension to request processing means this provider applies.
   * @param provider  Request processing capabilities provider.
   *
   * @returns Request processing capability set that call the given `provider` to apply capabilities.
   */
  of<TInput, TExt>(
      this: void,
      provider: RequestCapabilities.Provider<TInput, TExt>,
  ): RequestCapabilities<TInput, TExt> {

    const capabilities: RequestCapabilities<TInput, TExt> = {
      for: provider,
      and<TNext>(next: RequestCapabilities<TInput & TExt, TNext>): RequestCapabilities<TInput, TExt & TNext> {
        return RequestCapabilities.combine(capabilities, next);
      },
    };

    return capabilities;
  },

  /**
   * Combines two request processing capability sets.
   *
   * @typeparam TInput  A type of request processing means expected by the `first` capability set.
   * @typeparam TExt  A type of request processing means extension applied by the `first` capability set.
   * @typeparam TNext  A type of request processing means extension applied by the `second` capability set.
   * @param first  First set of capabilities to combine.
   * @param second  Second set of capabilities to combine. Receives requests modified by the `first` capability set.
   *
   * @return Combined request processing capability set that applies modifications to request by the `first` set of
   * capabilities, and then - by the `second` one.
   */
  combine<TInput, TExt, TNext>(
      this: void,
      first: RequestCapabilities<TInput, TExt>,
      second: RequestCapabilities<TInput & TExt, TNext>,
  ): RequestCapabilities<TInput, TExt & TNext> {

    const chain: RequestCapabilities<TInput, TExt & TNext> = {

      for<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt & TNext>): RequestHandler<TMeans> {
        return first.for(second.for(delegate));
      },

      and<T>(next: RequestCapabilities<TInput & TExt & TNext, T>): RequestCapabilities<TInput, TExt & TNext & T> {
        return RequestCapabilities.combine<TInput, TExt & TNext, T>(chain, next);
      },

    };

    return chain;
  },

};
