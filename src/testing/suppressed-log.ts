/**
 * @packageDocumentation
 * @module @hatsy/hatsy/testing
 */
import { Console } from 'console';
import { Writable } from 'stream';

const noout = (/*#__PURE__*/ new Writable({
  write(_chunk: any, _encoding: string, callback: (error?: (Error | null)) => void) {
    callback();
  },
}));

/**
 * Console instance that logs nothing.
 */
export const suppressedLog: Console = (/*#__PURE__*/ new Console({
  stdout: noout,
  stderr: noout,
}));
