/** Drop a contract prefix so vault.ping() selects the same bytes as ping(). */
export function plainSignature(input: string): string {
  const trimmed = input.trim();
  const dotted = trimmed.match(/^[A-Za-z_][\w]*\.([A-Za-z_][\w]*\([^)]*\))$/);
  return dotted?.[1] ?? trimmed;
}
