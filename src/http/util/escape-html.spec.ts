import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes HTML-unsafe symbols', () => {
    expect(escapeHtml('<b&b>')).toEqual('&lt;b&amp;b&gt;');
  });
  it('escapes subsequent HTML-unsafe symbols', () => {
    expect(escapeHtml('<<<=>>>')).toEqual('&lt;&lt;&lt;=&gt;&gt;&gt;');
  });
});
