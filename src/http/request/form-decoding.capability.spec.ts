import { dispatchError } from '../../core';
import { Logging } from '../../core/logging';
import { suppressedLog, TestHttpServer } from '../../testing';
import { httpListener } from '../http-listener';
import { renderHttpError, Rendering } from '../render';
import { FormDecoding } from './form-decoding.capability';

describe('FormDecoding', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockImplementation(
        httpListener(
            Logging.logBy(suppressedLog).for(
                dispatchError(
                    renderHttpError,
                    Rendering
                        .and(FormDecoding)
                        .for(({ requestBody, renderJson }) => {
                          renderJson({ request: Array.from(requestBody.entries()) });
                        }),
                ),
            ),
        ),
    );
  });

  it('processes submitted form', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: [['param1', 'value1'], ['param2', 'value2']] });
  });
  it('transforms submitted form', async () => {
    server.listener.mockImplementation(
        httpListener(
            Logging.logBy(suppressedLog).for(
                dispatchError(
                    renderHttpError,
                    Rendering
                        .and(FormDecoding.withBody(params => Array.from(params.entries())))
                        .for(({ requestBody, renderJson }) => {
                          renderJson(requestBody);
                        }),
                ),
            ),
        ),
    );

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual([['param1', 'value1'], ['param2', 'value2']]);
  });
  it('processes submitted form with text/plain content type', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: {
            'content-type': 'text/plain',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: [['param1', 'value1'], ['param2', 'value2']] });
  });
  it('processes submitted form without content type', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          method: 'POST',
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: [['param1', 'value1'], ['param2', 'value2']] });
  });
  it('responds with 415 (Unsupported Media Type) with unsupported request type', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: { 'content-type': 'application/json' },
        },
    );

    expect(response.statusCode).toBe(415);
    expect(await response.body()).toContain('application/x-www-form-urlencoded request expected');
  });
});
