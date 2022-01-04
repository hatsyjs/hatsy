import type { Readable } from 'node:stream';

/**
 * @internal
 */
export async function readAll(input: Readable): Promise<string> {

  let output = '';

  for await (const chunk of input) {
    output += chunk;
  }

  return output;
}
