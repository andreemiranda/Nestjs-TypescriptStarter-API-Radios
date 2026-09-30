import * as fs from 'fs';
import * as path from 'path';
import { InternalServerErrorException } from '@nestjs/common';
import { Radio } from '../radios/interfaces/radio.interface';

export class DatabaseLoader {
  static resolveDatabasePath(): string {
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

    throw new InternalServerErrorException(
      'Radios database file (radios.json) not found',
    );
  }

  static loadRadios(): Radio[] {
    const filePath = this.resolveDatabasePath();
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Failed to read radios database: ${errorMsg}`,
      );
    }

    try {
      const parsed: unknown = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error('Database content is not an array');
      }
      return parsed as Radio[];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Invalid JSON format in radios database: ${errorMsg}`,
      );
    }
  }
}
