/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * @internal
 */
const htmlUnsafe: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * @internal
 */
function replaceHtmlUnsafe(char: string): string {
  return htmlUnsafe[char];
}

/**
 * Escapes HTML-unsafe entities.
 *
 * @param text  Text to escape.
 *
 * @returns HTML-escaped text.
 */
export function escapeHtml(text: string | null | undefined): string {
  return text ? text.replace(/[&<>]/g, replaceHtmlUnsafe) : '';
}
