import * as fs from 'fs';
import * as path from 'path';
import { InternalServerErrorException } from '@nestjs/common';
import { Radio } from '../radios/interfaces/radio.interface';

export class DatabaseLoader {
  static resolveDatabasePath(): string | null {
    if (
      process.env.RADIOS_DB_PATH &&
      fs.existsSync(process.env.RADIOS_DB_PATH)
    ) {
      return process.env.RADIOS_DB_PATH;
    }

    const candidates = [
      path.join(__dirname, 'radios.json'),
      path.join(__dirname, '..', 'database', 'radios.json'),
      path.join(__dirname, '..', '..', 'src', 'database', 'radios.json'),
      path.join(process.cwd(), 'src', 'database', 'radios.json'),
      path.join(process.cwd(), 'dist', 'database', 'radios.json'),
      path.join(process.cwd(), 'dist', 'src', 'database', 'radios.json'),
      path.join(process.cwd(), 'database', 'radios.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  static loadRadios(): Radio[] {
    const filePath = this.resolveDatabasePath();
    if (filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed: unknown = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed as Radio[];
        }
      } catch {
        // Fall back to embedded require below
      }
    }

    try {
      // Direct require fallback ensuring serverless environments like Vercel have in-memory data
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const embedded: unknown = require('./radios.json');
      if (Array.isArray(embedded)) {
        return embedded as Radio[];
      }
    } catch {
      // Ignore fallback failure
    }

    throw new InternalServerErrorException(
      'Radios database file (radios.json) not found',
    );
  }
}
