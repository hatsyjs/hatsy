/**
 * @packageDocumentation
 * @module @hatsy/hatsy/testing
 */
import { noop } from '@proc7ts/primitives';
import type { RequestLogger } from '../core';

/**
 * Console instance that logs nothing.
 */
export const suppressedLog: RequestLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
};
