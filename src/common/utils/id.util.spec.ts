import {
  isValid14DigitId,
  toNonRepeating14DigitId,
  generate14DigitId,
} from './id.util';

describe('ID Utility (14 digits without 0 and without consecutive repeated digits)', () => {
  it('should validate valid 14-digit IDs without zeros and without consecutive repeated digits', () => {
    expect(isValid14DigitId(49639317164246)).toBe(true);
    expect(isValid14DigitId('49639317164246')).toBe(true);
    expect(isValid14DigitId(98593439412985)).toBe(true);
    expect(isValid14DigitId(12345678912345)).toBe(true);
  });

  it('should reject IDs containing zero (0)', () => {
    expect(isValid14DigitId(10123456789123)).toBe(false);
    expect(isValid14DigitId('98765432101234')).toBe(false);
    expect(isValid14DigitId('12345678901234')).toBe(false);
  });

  it('should reject IDs containing consecutive repeated digits', () => {
    expect(isValid14DigitId('11234567891234')).toBe(false); // '11'
    expect(isValid14DigitId('12345678991234')).toBe(false); // '99'
    expect(isValid14DigitId('11111111111111')).toBe(false); // all repeated
    expect(isValid14DigitId('88888888888888')).toBe(false);
    expect(isValid14DigitId(11111111111111)).toBe(false);
  });

  it('should reject IDs with length other than 14 digits', () => {
    expect(isValid14DigitId(12345)).toBe(false);
    expect(isValid14DigitId('12345')).toBe(false);
    expect(isValid14DigitId('123456789123456')).toBe(false); // 15 digits
    expect(isValid14DigitId('1234567891234')).toBe(false); // 13 digits
    expect(isValid14DigitId('abc')).toBe(false);
    expect(isValid14DigitId(null)).toBe(false);
    expect(isValid14DigitId(undefined)).toBe(false);
  });

  it('toNonRepeating14DigitId should generate 14-digit IDs without 0 and without consecutive repeated digits', () => {
    const generated = new Set<number>();
    for (let i = 1; i <= 300; i++) {
      const id = toNonRepeating14DigitId(i);
      const str = id.toString();
      expect(str).toHaveLength(14);
      expect(str).not.toContain('0');
      expect(/(.)\1/.test(str)).toBe(false);
      expect(isValid14DigitId(id)).toBe(true);
      generated.add(id);
    }
    expect(generated.size).toBe(300);
  });

  it('generate14DigitId should produce valid IDs', () => {
    for (let i = 0; i < 20; i++) {
      const id = generate14DigitId();
      const str = id.toString();
      expect(str).toHaveLength(14);
      expect(str).not.toContain('0');
      expect(/(.)\1/.test(str)).toBe(false);
      expect(isValid14DigitId(id)).toBe(true);
    }
  });
});
