import { HttpError } from './http-error';

describe('HttpError', () => {
  describe('message', () => {
    it('contains status code without missing message', () => {
      expect(new HttpError(404).message).toBe('404');
    });
    it('contains status code and message', () => {
      expect(new HttpError(404, 'Not Found').message).toBe('404 Not Found');
    });
  });
});
