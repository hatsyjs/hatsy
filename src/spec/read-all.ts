import { Readable } from 'stream';

export async function readAll(input: Readable): Promise<string> {

  let output = '';

  for await (const chunk of input) {
    output += chunk;
  }

  return output;
}
