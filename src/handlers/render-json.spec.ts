import { hatsyListener } from '../listener';
import { readAll, testServer, TestServer } from '../spec';
import { hatsyRenderJson } from './render-json';

describe('hatsyRenderJSON', () => {

  let server: TestServer;

  beforeEach(async () => {
    server = await testServer();
  });
  afterEach(async () => {
    await server.stop();
  });

  it('renders JSON', async () => {

    const json = { name: 'test response' };

    server.listener.mockImplementation(hatsyListener(hatsyRenderJson(json)));

    const response = await server.get('/');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json');
    expect(JSON.parse(await readAll(response))).toEqual(json);
  });
});
