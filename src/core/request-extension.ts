/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext } from './request-context';
import { RequestHandler } from './request-handler';
import { RequestModification } from './request-modification';
import { RequestModifier, RequestModifier__symbol } from './request-modifier';

/**
 * Request extension.
 *
 * This is a {@link RequestModifier request modifier} implementation able to construct a request handler
 * that extends the original request processing means.
 *
 * It also contains method for request modifications chaining.
 *
 * @category Core
 * @typeparam TInput  A type of request processing means expected by handlers created by this extension.
 * @typeparam TExt  A type of request processing means extension applied by this extension.
 */
export abstract class RequestExtension<TInput, TExt = object>
    implements RequestModifier<TInput, TExt>, RequestExtension.Chain<TInput, TExt> {

  /**
   * Combines two request extension chains into one.
   *
   * @typeparam TInput  A type of request processing means expected by first chain.
   * @typeparam TExt  A type of request processing means extension applied by first chain.
   * @typeparam TNext  A type of request processing means extension applied by second chain.
   * @param first  First chain to combine.
   * @param second  Second chain to combine. Receives requests modified by first chain.
   *
   * @return New request processing chain that applies modifications to request by `first` chain, and then - by
   * `second` one.
   */
  static chain<TInput, TExt, TNext>(
      first: RequestExtension.Chain<TInput, TExt>,
      second: RequestExtension.Chain<TInput & TExt, TNext>,
  ): RequestExtension.Chain<TInput, TExt & TNext> {

    const chain: RequestExtension.Chain<TInput, TExt & TNext> = {

      handler<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt & TNext>): RequestHandler<TMeans> {
        return first.handler(second.handler(delegate));
      },

      and<T>(next: RequestExtension.Chain<TInput & TExt & TNext, T>): RequestExtension.Chain<TInput, TExt & TNext & T> {
        return RequestExtension.chain<TInput, TExt & TNext, T>(chain, next);
      },

    };

    return chain;
  }

  /**
   * Unique modifier identifier.
   *
   * @default This instance.
   */
  get [RequestModifier__symbol](): any {
    return this;
  }

  /**
   * Builds request modification to apply by {@link handler}.
   *
   * @typeparam TMeans  A type of request processing means expected by {@link handler}.
   * @param context  Request processing context to modify.
   *
   * @returns Request modifications to apply.
   */
  abstract modification<TMeans extends TInput>(context: RequestContext<TMeans>): RequestModification<TMeans, TExt>;

  /**
   * Builds request processing handler that {@link modification modifies request} and delegates to another handler.
   *
   * @typeparam TMeans  Request processing means expected by new handler.
   * @param delegate  Request processing handler that will receive modified request context.
   *
   * @returns New request processing handler.
   */
  handler<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt>): RequestHandler<TMeans> {
    return async ({ next, modifiedBy }) => {
      if (modifiedBy(this[RequestModifier__symbol])) {
        await next(delegate);
      } else {
        await next(delegate, this as unknown as RequestExtension<TMeans, TExt>);
      }
    };
  }

  /**
   * Combines this extension with extension chain.
   *
   * @typeparam TNext  A type of request processing means extension applied by next chain.
   * @param next  Next request processing chain that receives requests modified by this extension.
   *
   * @return New request processing chain that {@link modification modifies request}, and then applies modifications
   * by next chain.
   *
   * @see RequestExtension.chain
   */
  and<TNext>(next: RequestExtension.Chain<TInput & TExt, TNext>): RequestExtension.Chain<TInput, TExt & TNext> {
    return RequestExtension.chain<TInput, TExt, TNext>(this, next);
  }

}

export namespace RequestExtension {

  /**
   * Request extension chain.
   *
   * It is able to construct a request handler that extends the original request processing means.
   *
   * @typeparam TInput  A type of request processing means expected by handlers created by this chain.
   * @typeparam TExt  A type of request processing means extension applied by this chain.
   */
  export interface Chain<TInput, TExt> {

    /**
     * Builds request processing handler that modifies request and delegates to another handler.
     *
     * @typeparam TMeans  Request processing means expected by new handler.
     * @param delegate  Request processing handler that will receive modified request context.
     *
     * @returns New request processing handler.
     */
    handler<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt>): RequestHandler<TMeans>

    /**
     * Combines this chain with another one.
     *
     * @typeparam TNext  A type of request processing means extension applied by another chain.
     * @param next  Next request processing chain that receives requests modified by this one.
     *
     * @return New request processing chain that applies modifications to request by this chain, and then - by
     * another one.
     *
     * @see RequestExtension.chain
     */
    and<TNext>(next: Chain<TInput & TExt, TNext>): Chain<TInput, TExt & TNext>;

  }

}
