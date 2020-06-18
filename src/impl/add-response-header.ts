import { mapIt } from '@proc7ts/a-iterable';
import { arrayOfElements, elementOrArray } from '@proc7ts/primitives';
import { ServerResponse } from 'http';

/**
 * @internal
 */
export function addResponseHeader(response: ServerResponse, name: string, value: string): void {

  const oldValues = mapIt(arrayOfElements(response.getHeader(name)), String);
  const newValues = elementOrArray(new Set<string>(oldValues).add(value))!;

  response.setHeader(name, newValues);
}
