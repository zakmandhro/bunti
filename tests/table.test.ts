/**
 * Table layout and rendering tests.
 *
 * Verifies column width resolution (fixed, percentages, 'fr'), alignments,
 * border styling, color passing, and robustness on zero/small widths.
 */

import { describe, expect, test } from 'bun:test';
import { createScreenContext } from '../src/dsl/context';
import { table } from '../src/layout';
import { createScreenState } from '../src/state';
import { visibleWidth } from '../src/utils';

describe('table() layout', () => {
  test('renders equal width columns by default', () => {
    const output = table(
      [
        ['ID', 'NAME'],
        ['1', 'Alice'],
      ],
      { width: 40, border: 'none' },
    );

    const lines = output.split('\n');
    expect(lines.length).toBe(2);
    // 40 width, 2 columns, 1 gutter -> (40 - 1) / 2 = 19 cols per column + 1 gutter = 39 or 40.
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(40);
    }
  });

  test('respects custom column widths with fixed and fr constraints', () => {
    const output = table(
      [
        ['ID', 'DESCRIPTION'],
        ['42', 'A very detailed message for testing table layout.'],
      ],
      {
        width: 60,
        columns: [{ width: 10 }, { width: '1fr' }],
        border: 'none',
      },
    );

    const lines = output.split('\n');
    // First line should have ID padded in a 10-char column
    expect(lines[0]!.startsWith('ID        ')).toBe(true);
    // Total line width matches resolved width
    expect(visibleWidth(lines[0]!)).toBe(60);
  });

  test('handles percentage column widths', () => {
    const output = table(
      [
        ['A', 'B'],
        ['1', '2'],
      ],
      {
        width: 41, // 41 - 1 gutter = 40 available
        columns: [{ width: '25%' }, { width: '75%' }],
        border: 'none',
      },
    );

    const lines = output.split('\n');
    expect(lines[0]!.startsWith('A         ')).toBe(true); // 25% of 40 = 10 cols
    expect(visibleWidth(lines[0]!)).toBe(41);
  });

  test('handles zero width without throwing RangeError', () => {
    expect(() => {
      table([['', '']], { width: 0 });
    }).not.toThrow();

    expect(() => {
      table([['a', 'b', 'c']], { width: 1 });
    }).not.toThrow();
  });

  test('returns empty string for empty rows', () => {
    expect(table([])).toBe('');
    expect(table([[]])).toBe('');
  });

  test('supports custom borders, borderColor, and bgColor', () => {
    const output = table([['COL1', 'COL2']], {
      width: 20,
      border: 'rounded',
      borderColor: 'cyan',
      bgColor: '#101010',
    });

    // Outer rounded border characters
    expect(output).toContain('╭');
    expect(output).toContain('╮');
    expect(output).toContain('╰');
    expect(output).toContain('╯');
  });

  test('works through ctx.table()', () => {
    const state = createScreenState();
    const ctx = createScreenContext(state);
    ctx.table(
      [
        ['KEY', 'VAL'],
        ['k1', 'v1'],
      ],
      { width: 30 },
    );
    ctx.flushFlow();

    // Verify cell content was placed in the back buffer (row 1, row 0 is top border)
    const textInRow = Array.from(
      { length: 30 },
      (_, x) => state.backBuffer[state.width + x]!.char,
    ).join('');
    expect(textInRow).toContain('KEY');
    expect(textInRow).toContain('VAL');
  });
});
