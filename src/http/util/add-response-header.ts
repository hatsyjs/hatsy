/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { arrayOfElements, elementOrArray } from '@proc7ts/primitives';
import { ServerResponse } from 'http';

/**
 * Appends HTTP header value to server response.
 *
 * Avoids value duplication.
 *
 * @param response  HTTP response to add header to.
 * @param name  Target HTTP header name.
 * @param value  HTTP header value to add.
 */
export function addResponseHeader(response: ServerResponse, name: string, value: string): void {

  const oldValues = arrayOfElements(response.getHeader(name)).map(String);
  const newValues = elementOrArray(new Set<string>(oldValues).add(value))!;

  response.setHeader(name, newValues);
}
