import { HTTPError } from './http-error';

describe('HTTPError', () => {
  describe('message', () => {
    it('contains status code without missing message', () => {
      expect(new HTTPError(404).message).toBe('404');
    });
    it('contains status code and message', () => {
      expect(new HTTPError(404, 'Not Found').message).toBe('404 Not Found');
    });
  });
});
