import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { consoleLogger, silentLogger } from '@proc7ts/logger';
import { noop } from '@proc7ts/primitives';
import type { Mock } from 'jest-mock';
import type { RequestContext } from '../request-context';
import type { RequestHandler } from '../request-handler';
import type { RequestProcessor } from '../request-processor';
import { requestProcessor } from '../request-processor';
import type { LoggerMeans } from './logger.means';
import { Logging } from './logging.capability';
import type { RequestLogger } from './request-logger';

describe('Logging', () => {

  let handler: Mock<void, [RequestContext<LoggerMeans>]>;

  beforeEach(() => {
    handler = jest.fn();
  });

  describe('by default', () => {
    it('uses `console` as request logger', async () => {

      await processor(Logging.for(handler))({});

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ log: consoleLogger }));
    });
    it('does not override the request logger', async () => {

      const log: RequestLogger = silentLogger;

      await processor<LoggerMeans>(Logging.for(handler))({ log });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ log }));
    });
  });

  describe('logBy', () => {
    it('overrides request logger', async () => {

      const extendedLog = {
        fatal: noop,
        error: noop,
        warn: noop,
        info: noop,
        debug: noop,
        trace: noop,
      };

      await processor<LoggerMeans>(Logging.logBy<typeof extendedLog>(extendedLog).for(handler))({ log: console });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ log: extendedLog }));
    });
  });

  function processor<TMeans>(handler: RequestHandler<TMeans>): RequestProcessor<TMeans> {
    return requestProcessor({
      handler,
      async next<TExt>(
          handler: RequestHandler<TMeans & TExt>,
          context: RequestContext<TMeans & TExt>,
      ): Promise<boolean> {
        await handler(context);
        return true;
      },
    });
  }
});
