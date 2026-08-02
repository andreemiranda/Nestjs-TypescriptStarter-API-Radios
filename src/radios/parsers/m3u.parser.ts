import * as fs from 'fs';
import * as path from 'path';
import { Radio } from '../interfaces/radio.interface';

export class M3uParser {
  static parse(filePath: string): Radio[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const radios: Radio[] = [];
    let id = 1;
    let pendingMeta: Partial<Radio> | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      if (line.startsWith('#EXTM3U')) {
        continue;
      }
      if (line.startsWith('#EXTINF')) {
        pendingMeta = this.parseExtinf(line);
        continue;
      }
      if (line.startsWith('#')) {
        continue;
      }
      if (pendingMeta) {
        radios.push({
          id: id++,
          name: pendingMeta.name ?? '',
          streamUrl: line,
          logo: pendingMeta.logo ?? '',
          state: pendingMeta.state ?? '',
          tags: pendingMeta.tags ?? [],
        });
        pendingMeta = null;
      }
    }

    return radios;
  }

  static resolvePlaylistPath(filename: string): string {
    const candidates = [
      path.join(__dirname, '..', '..', 'streams', filename),
      path.join(process.cwd(), 'dist', 'streams', filename),
      path.join(process.cwd(), 'src', 'streams', filename),
      path.join(process.cwd(), 'streams', filename),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    throw new Error(`Playlist file not found: ${filename}`);
  }

  private static parseExtinf(line: string): Partial<Radio> {
    const nameMatch = line.match(/tvg-name="([^"]*)"/);
    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
    const groupMatch = line.match(/group-title="([^"]*)"/);
    const commaIndex = line.lastIndexOf(',');
    const displayName =
      commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : '';

    const groupTitle = groupMatch?.[1] ?? '';
    const { state, tags } = this.parseGroupTitle(groupTitle);

    return {
      name: nameMatch?.[1]?.trim() || displayName,
      logo: logoMatch?.[1] ?? '',
      state,
      tags,
    };
  }

  private static parseGroupTitle(groupTitle: string): {
    state: string;
    tags: string[];
  } {
    if (!groupTitle) {
      return { state: '', tags: [] };
    }
    const parts = groupTitle.split('|').map((p) => p.trim());
    const state = parts[0] ?? '';
    const tags = parts
      .slice(1)
      .flatMap((p) =>
        p.split('/').map((t) => t.trim()).filter(Boolean),
      );
    return { state, tags };
  }
}
