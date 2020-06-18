import { itsReduction } from '@proc7ts/a-iterable';
import { setOfElements } from '@proc7ts/primitives';
import { ServerResponse } from 'http';

/**
 * @internal
 */
export function addResponseHeader(response: ServerResponse, name: string, value: string): void {
  response.setHeader(
      name,
      itsReduction(
          setOfElements(response.getHeader(name)).add(value),
          (prev, next) => prev ? `${prev},${next}` : String(next),
          '',
      ),
  );
}
