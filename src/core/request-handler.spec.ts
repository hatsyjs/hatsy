import { valueProvider } from '@proc7ts/primitives';
import type { ServerResponse } from 'http';
import type { RequestContext } from './request-context';
import { requestHandler, RequestHandler } from './request-handler';

describe('requestHandler', () => {

  let context: RequestContext<object>;
  let response: ServerResponse;

  beforeEach(() => {
    response = {
      writableEnded: false,
    } as ServerResponse;
    context = {
      response,
      next: async (handler: RequestHandler<any>) => {
        await handler(context);
        return response.writableEnded;
      },
      modifiedBy: valueProvider(false),
    } as RequestContext<object>;
  });

  it('returns the only handler', () => {

    const handler: RequestHandler<any> = () => {/* handler */};

    expect(requestHandler(handler)).toBe(handler);
  });
  it('executes handlers in order', async () => {

    const calls: number[] = [];

    await requestHandler([
      () => { calls.push(1); },
      () => { calls.push(2); },
      () => { calls.push(3); },
    ])(context);

    expect(calls).toEqual([1, 2, 3]);
  });
  it('stops handlers execution once handler throws', async () => {

    const error = new Error('test');
    const calls: number[] = [];

    const call = async (): Promise<unknown> => await requestHandler([
      () => { calls.push(1); },
      () => { calls.push(2); throw error; },
      () => { calls.push(3); },
    ])(context);

    expect(await call().catch(err => err)).toBe(error);
    expect(calls).toEqual([1, 2]);
  });
  it('stops handlers execution once response written', async () => {

    const calls: number[] = [];
    const call = async (): Promise<unknown> => await requestHandler([
      () => { calls.push(1); },
      () => { calls.push(2); (response as any).writableEnded = true; },
      () => { calls.push(3); },
    ])(context);

    await call();
    expect(calls).toEqual([1, 2]);
  });
});
