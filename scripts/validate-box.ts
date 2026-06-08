import { bunti } from '../src/index';
import { visibleWidth } from '../src/utils';

/**
 * Bunti Box v2.0 Validation Suite
 *
 * This script verifies the mathematical and structural integrity of the
 * Universal Box Primitive against the specs/box.md.
 */

async function run() {
  console.log('🥟  BUNTI :: BOX VALIDATION SUITE');
  console.log('--------------------------------');

  let failures = 0;
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ ${msg}`);
    } else {
      console.log(`❌ ${msg}`);
      failures++;
    }
  };

  // --- 1. Zero-Default Check ---
  console.log('\n[1] Zero-Default Protocol:');
  const ghost = bunti.box('HELLO');
  const ghostWidth = visibleWidth(ghost);
  const ghostLines = ghost.split('\n');
  assert(ghostWidth === 5, 'Ghost box width fits content exactly (5)');
  assert(ghostLines.length === 1, 'Ghost box height fits content exactly (1)');
  assert(!ghost.includes('┌'), 'Ghost box has no borders by default');

  // --- 2. Sizing Constraints ---
  console.log('\n[2] Sizing Constraints:');
  const fixed = bunti.box('HI', { width: 20, border: 'default' });
  assert(
    visibleWidth(fixed) === 20,
    'Fixed width (20) with border is exactly 20',
  );

  const padded = bunti.box('HI', { padding: [1, 2], border: 'none' });
  const paddedLines = padded.split('\n');
  assert(
    visibleWidth(padded) === 6,
    "Padding [1,2] adds 4 cols to 'HI' (2+4=6)",
  );
  assert(
    paddedLines.length === 3,
    'Padding [1,2] adds 2 rows to 1 line content (1+2=3)',
  );

  const percent = bunti.box('HI', { width: '50%' }, 100);
  assert(
    visibleWidth(percent) === 50,
    "Percentage width ('50%') of 100 resolve to 50",
  );

  const flex = bunti.box('HI', { width: '1fr' }, 80);
  assert(visibleWidth(flex) === 80, "Flex width ('1fr') of 80 resolve to 80");

  // --- 3. ANSI Integrity ---
  console.log('\n[3] ANSI Integrity:');
  const redText = `\x1b[31mRED\x1b[0m`;
  const wrapped = bunti.box(`${redText} LONG TEXT`, { width: 5, wrap: true });
  assert(wrapped.includes('\x1b[31m'), 'ANSI codes preserved during wrapping');

  // --- 5. Table Primitive ---
  console.log('\n[5] Table Primitive:');
  const tableData = [
    ['A1', 'B1'],
    ['A2', 'B2'],
  ];
  const renderedTable = bunti.table(tableData, { width: 40 });
  assert(visibleWidth(renderedTable) === 40, 'Table width (40) is respected');
  assert(renderedTable.split('\n').length >= 4, 'Table contains multiple rows');

  console.log('\n--------------------------------');
  if (failures === 0) {
    console.log('🥟  SIGNAL: TOTAL SUCCESS');
    process.exit(0);
  } else {
    console.log(`🥟  SIGNAL: FAILED (${failures} errors)`);
    process.exit(1);
  }
}

run();
