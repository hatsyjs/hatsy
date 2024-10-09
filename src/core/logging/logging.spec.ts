import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { consoleLogger, silentLogger } from '@proc7ts/logger';
import { noop } from '@proc7ts/primitives';
import type { RequestContext } from '../request-context.js';
import type { RequestHandler } from '../request-handler.js';
import type { RequestProcessor } from '../request-processor.js';
import { requestProcessor } from '../request-processor.js';
import type { LoggerMeans } from './logger.means.js';
import { Logging } from './logging.capability.js';
import type { RequestLogger } from './request-logger.js';

describe('Logging', () => {
  let handler: jest.Mock<(context: RequestContext<LoggerMeans>) => void>;

  beforeEach(() => {
    handler = jest.fn();
  });

  describe('by default', () => {
    it('uses `console` as request logger', async () => {
      await processor(Logging.for(handler))({});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ log: consoleLogger }) as unknown as RequestContext<LoggerMeans>,
      );
    });
    it('does not override the request logger', async () => {
      const log: RequestLogger = silentLogger;

      await processor<LoggerMeans>(Logging.for(handler))({ log });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ log }) as unknown as RequestContext<LoggerMeans>,
      );
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

      await processor<LoggerMeans>(Logging.logBy<typeof extendedLog>(extendedLog).for(handler))({
        log: console,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ log: extendedLog }) as unknown as RequestContext<LoggerMeans>,
      );
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
