const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const UNSAFE_HTML_CHARS = new RegExp("[<>&" + LS + PS + "]", "g");

const ESCAPE_MAP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LS]: "\\u2028",
  [PS]: "\\u2029",
};

/**
 * Serialize a JSON-LD payload for inline <script> injection.
 * Escapes <, >, & and U+2028/U+2029 so a string value like </script>
 * can't terminate the surrounding script tag, and so line/paragraph
 * separators (legal in JSON, illegal in JS source) don't break parsing.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE_HTML_CHARS, (c) => ESCAPE_MAP[c]);
}
