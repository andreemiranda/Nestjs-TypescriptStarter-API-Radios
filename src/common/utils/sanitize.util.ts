/**
 * Utilitario consolidado de higienizacao de entrada.
 * Normaliza Unicode (NFC), remove caracteres de controle e espacos invisiveis.
 */
export function sanitizeInput(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  // 1. Normaliza para forma canonica NFC
  let normalized = value.normalize('NFC');

  // 2. Remove caracteres de controle (ASCII 0-31, 127) e espacos invisiveis (zero-width)
  // eslint-disable-next-line no-control-regex
  normalized = normalized.replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF]/g, '');

  // 3. Remove espacos excedentes nas extremidades
  normalized = normalized.trim();

  return normalized.length > 0 ? normalized : undefined;
}

export function cleanParam(value: string): string {
  const result = sanitizeInput(value);
  return result ?? '';
}

// Mantem alias para compatibilidade com DTOs
export const sanitizeString = sanitizeInput;
