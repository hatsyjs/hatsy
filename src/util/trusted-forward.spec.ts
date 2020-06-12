import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { trustedForward } from './trusted-forward';

describe('trustedForward', () => {

  let request: IncomingMessage;
  let headers: IncomingHttpHeaders;

  beforeEach(() => {
    headers = {};
    request = { get headers() { return headers; } } as IncomingMessage;
  });

  it('does not extract absent forwarding info', () => {
    expect(trustedForward(request, { trusted: true })).toBeUndefined();
  });
  it('does not trust forwarding info by default', () => {
    headers = { forwarded: 'host=test' };
    expect(trustedForward(request)).toBeUndefined();
  });
  it('extracts first record when trust', () => {
    headers = { forwarded: 'host=test1;proto=http,host=test2;proto=https' };
    expect(trustedForward(request, { trusted: true })).toEqual({ host: 'test1', proto: 'http' });
  });
  it('extracts first trusted source record', () => {
    headers = {
      forwarded: 'host=test;proto=http,'
          + 'by=proxy1;host=test1;proto=http,'
          + 'by=proxy2;host=test2;proto=https',
    };
    expect(trustedForward(request, { trusted: ['proxy2'] })).toEqual({
      by: 'proxy2',
      host: 'test2',
      proto: 'https',
    });
  });
  it('extracts first trusted record with requested key', () => {
    headers = { forwarded: 'by=proxy1;host=test1;proto=http,by=proxy2;host=test2;proto=https;secret=some' };
    expect(trustedForward(request, { trusted: [['secret', 'some']] })).toEqual({
      by: 'proxy2',
      host: 'test2',
      proto: 'https',
      secret: 'some',
    });
  });
  it('does not extract untrusted records', () => {
    headers = { forwarded: 'by=proxy1;host=test1;proto=http,by=proxy2;host=test2;proto=https;secret=some' };
    expect(trustedForward(request, { trusted: [['secret', 'other']] })).toBeUndefined();
  });
  it('handles items without names', () => {
    headers = { forwarded: 'by=proxy1;host=test1;proto=http,wrong;host=test2;proto=https;secret=some' };
    expect(trustedForward(request, { trusted: [['secret', 'some']] })).toEqual({
      host: 'test2',
      proto: 'https',
      secret: 'some',
    });
  });
  it('handles parameters without names', () => {
    headers = { forwarded: 'by=proxy1;host=test1;proto=http,by=proxy2;wrong;host=test2;proto=https;secret=some' };
    expect(trustedForward(request, { trusted: [['secret', 'some']] })).toEqual({
      by: 'proxy2',
      host: 'test2',
      proto: 'https',
      secret: 'some',
    });
  });
});
