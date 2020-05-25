import { ServerResponse } from 'http';
import { hatsyHandler, HatsyHandler, HatsyRequestContext } from './handler';

describe('hatsyHandler', () => {

  let context: HatsyRequestContext;
  let response: ServerResponse;

  beforeEach(() => {
    response = {
      writableEnded: false,
    } as ServerResponse;
    context = {
      response,
      next: async (handler: HatsyHandler) => {
        await handler(context);
        return response.writableEnded;
      },
    } as unknown as HatsyRequestContext;
  });

  it('returns the only handler', () => {

    const handler: HatsyHandler = () => {/* handler */};

    expect(hatsyHandler(handler)).toBe(handler);
  });
  it('executes handlers in order', async () => {

    const calls: number[] = [];

    await hatsyHandler([
      () => { calls.push(1); },
      () => { calls.push(2); },
      () => { calls.push(3); },
    ])(context);

    expect(calls).toEqual([1, 2, 3]);
  });
  it('stops handlers execution once handler throws', async () => {

    const error = new Error('test');
    const calls: number[] = [];

    const call = async (): Promise<void> => await hatsyHandler([
      () => { calls.push(1); },
      () => { calls.push(2); throw error; },
      () => { calls.push(3); },
    ])(context);

    expect(await call().catch(err => err)).toBe(error);
    expect(calls).toEqual([1, 2]);
  });
  it('stops handlers execution once response written throws', async () => {

    const calls: number[] = [];

    const call = async (): Promise<void> => await hatsyHandler([
      () => { calls.push(1); },
      () => { calls.push(2); (response as any).writableEnded = true; },
      () => { calls.push(3); },
    ])(context);

    await call();
    expect(calls).toEqual([1, 2]);
  });
});
