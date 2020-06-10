/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestContext, RequestModification } from './request-context';
import { RequestHandler } from './request-handler';
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
 */
export abstract class RequestExtension<TInput, TExt = object>
    implements RequestModifier<TInput, TExt>, RequestExtension.Chain<TInput, TExt> {

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

  abstract modification(context: RequestContext<TInput>): RequestModification<TInput, TExt>;

  handler<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt>): RequestHandler<TMeans> {
    return async ({ next, modifiedBy }) => {
      if (modifiedBy(this[RequestModifier__symbol])) {
        await next(delegate);
      } else {
        await next(delegate, this as unknown as RequestExtension<TMeans, TExt>);
      }
    };
  }

  and<TNext>(next: RequestExtension.Chain<TInput & TExt, TNext>): RequestExtension.Chain<TInput, TExt & TNext> {
    return RequestExtension.chain<TInput, TExt, TNext>(this, next);
  }

}

export namespace RequestExtension {

  export interface Chain<TInput, TExt> {

    handler<TMeans extends TInput>(delegate: RequestHandler<TMeans & TExt>): RequestHandler<TMeans>

    and<TNext>(next: Chain<TInput & TExt, TNext>): Chain<TInput, TExt & TNext>;

  }

}
