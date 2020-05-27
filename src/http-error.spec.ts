import { HatsyHttpError } from './http-error';

describe('HatsyHttpError', () => {
  describe('message', () => {
    it('contains status code without missing message', () => {
      expect(new HatsyHttpError(404).message).toBe('404');
    });
    it('contains status code and message', () => {
      expect(new HatsyHttpError(404, 'Not Found').message).toBe('404 Not Found');
    });
  });
});
