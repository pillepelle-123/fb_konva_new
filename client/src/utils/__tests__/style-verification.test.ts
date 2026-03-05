/**
 * Unit-Tests für Style Verification (verifyStyles)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyStyles } from '../style-verification';

describe('Style Verification', () => {
  let consoleSpy: { error: ReturnType<typeof vi.spyOn> };

  beforeEach(() => {
    consoleSpy = { error: vi.spyOn(console, 'error').mockImplementation(() => {}) };
  });

  afterEach(() => {
    consoleSpy.error.mockRestore();
  });

  it('should return true when all required styles work', () => {
    const result = verifyStyles();
    expect(result).toBe(true);
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  it('should verify rough and default styles exist and generate valid paths', () => {
    const result = verifyStyles();
    expect(result).toBe(true);
  });
});
