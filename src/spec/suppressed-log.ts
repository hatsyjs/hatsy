import { Console } from 'console';
import { Writable } from 'stream';

const noout = new Writable({
  write(_chunk: any, _encoding: string, callback: (error?: (Error | null)) => void) {
    callback();
  },
});

export function suppressedLog(): Console {
  return new Console({
    stdout: noout,
    stderr: noout,
  });
}
