import { describe, expect, it } from '@jest/globals';
import { dueLog } from '@proc7ts/logger';
import { HttpError } from './http-error.js';

describe('HttpError', () => {
  describe('message', () => {
    it('contains status code without missing message', () => {
      expect(new HttpError(404).message).toBe('404');
    });
    it('contains status code and message', () => {
      expect(new HttpError(404, { statusMessage: 'Not Found' }).message).toBe('404 Not Found');
    });
    it('contains explicit message', () => {
      expect(new HttpError(404, { message: 'TEST' }).message).toBe('TEST');
    });
  });

  describe('toLog', () => {
    it('does nothing at input stage', () => {
      const error = new HttpError(400, { details: 'Test' });

      expect(dueLog({ on: 'in', line: [error] }).line).toEqual([error]);
    });
    it('expands status message at default stage', () => {
      expect(dueLog({ line: [new HttpError(404, { statusMessage: 'Not Found' })] }).line).toEqual([
        '404 Not Found',
      ]);
    });
    it('expands error details at default stage', () => {
      expect(dueLog({ line: [new HttpError(400, { details: 'Test' })] }).line).toEqual([
        '400',
        'Test',
      ]);
    });
    it('expands reason at output stage', () => {
      const cause = new Error('test');

      expect(dueLog({ on: 'out', line: [new HttpError(500, { cause })] }).line).toEqual([
        '500',
        cause,
      ]);
    });
  });
});
