export function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let cleaned = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      cleaned += value[i];
    }
  }
  cleaned = cleaned.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function cleanParam(value: string): string {
  let cleaned = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 32 && code !== 127) {
      cleaned += value[i];
    }
  }
  return cleaned.trim();
}
