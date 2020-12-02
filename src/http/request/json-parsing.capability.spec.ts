import { noop } from '@proc7ts/primitives';
import { TestHttpServer } from '../../testing';
import { Rendering } from '../render';
import { JsonParsing } from './json-parsing.capability';

describe('JsonParsing', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(noop);
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    server.handleBy(
        Rendering
            .and(JsonParsing)
            .for(({ requestBody, renderJson }) => {
              renderJson({ request: requestBody });
            }),
    );
  });

  it('processes JSON body', async () => {

    const response = await server.post(
        '/test',
        `{ "text": "hello" }`,
        {
          headers: {
            'content-type': 'application/json',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: { text: 'hello' } });
  });
  it('transforms JSON body form', async () => {
    server.handleBy(
        Rendering
            .and(JsonParsing.withBody(json => ({ json })))
            .for(({ requestBody, renderJson }) => {
              renderJson(requestBody);
            }),
    );

    const response = await server.post(
        '/test',
        `{ "text": "hello" }`,
        {
          headers: {
            'content-type': 'application/json',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ json: { text: 'hello' } });
  });
  it('processes JSON body with text/json content type', async () => {

    const response = await server.post(
        '/test',
        `{ "text": "hello" }`,
        {
          headers: {
            'content-type': 'text/json',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: { text: 'hello' } });
  });
  it('processes JSON body with text/plain content type', async () => {

    const response = await server.post(
        '/test',
        `{ "text": "hello" }`,
        {
          headers: {
            'content-type': 'text/plain',
          },
        },
    );

    expect(JSON.parse(await response.body())).toEqual({ request: { text: 'hello' } });
  });
  it('processes JSON body without content type', async () => {

    const response = await server.post('/test', `{ "text": "hello" }`);

    expect(JSON.parse(await response.body())).toEqual({ request: { text: 'hello' } });
  });
  it('responds with 415 (Unsupported Media Type) with unsupported request type', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        },
    );

    expect(response.statusCode).toBe(415);
    expect(await response.body()).toContain('application/json request expected');
  });
  it('responds with 400 (Bad Request) with non-JSON content', async () => {

    const response = await server.post(
        '/test',
        'param1=value1&param2=value2',
        {
          headers: { 'content-type': 'application/json' },
        },
    );

    expect(response.statusCode).toBe(400);
    expect(await response.body()).toContain('Malformed JSON');
    expect(errorSpy).toHaveBeenCalledWith(
        '400',
        'Malformed JSON',
        expect.objectContaining({ message: expect.stringContaining('Unexpected token') }),
    );
  });
});
