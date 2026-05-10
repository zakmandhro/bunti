# 🛰️ Spec: Bunti Universal Box Primitive (v2.0)

## 1. Vision
The `box` is the fundamental building block of Bunti. In v2.0, it evolves from a "border drawer" into a **Constraint-Aware Layout Node**. It is designed to be lean by default and powerful through composition.

## 2. The "Zero-Default" Model
To eliminate boilerplate and ensure predictable structural behavior:
- **Default Border**: `none` (Ghost Archetype).
- **Default Padding**: `[0, 0]` (No internal offset).
- **Default Alignment**: `left`.
- **Default Sizing**: `auto` (Fits to content).

## 3. Constraint-Based Sizing
Boxes support a flexible unit system:
- **Absolute**: `number` (e.g., `20` chars).
- **Percentage**: `"50%"` (Relative to parent/viewport).
- **Flex**: `"1fr"` (Fractional share of remaining parent space).
- **Auto**: Content-driven measurement.
- **Constraints**: `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.

## 4. The "Three-Pass" Reflow Engine
To solve the terminal "wrap-height" dependency:
1. **Pass 1: Intrinsic Measurement**: Nodes report their min/max width requirements.
2. **Pass 2: Flex Resolution**: Parent calculates absolute dimensions based on fr/% units.
3. **Pass 3: Surgical Reflow**: Content is wrapped to the fixed width and final height is locked.

## 5. Shared Edge Protocol (Grids & Tables)
Support for "Border Collapsing" to build industrial grids without double lines:
- **`borderCollapse: boolean`**: If true, adjacent boxes share a single line.
- **Junction Resolution**: Automatic replacement of corners with `┬`, `┴`, `┼`, `├`, `┤` where edges meet.

## 6. Anchoring & Viewports
- **Anchoring**: `top | bottom | left | right` (Locks to parent edges).
- **Overflow**: `scroll | hidden | visible`.
- **Scrolling**: `scrollY` for high-performance content clipping.

## 7. Performance & Native Mandates
- **Bun-Native First**: Strictly leverage `Bun.stringWidth`, `Bun.stdout.writer`, and Bun's SIMD-optimized string manipulation.
- **No Emoji Support (v2.0)**: Complex multi-width emojis are explicitly out of scope for this iteration. 
    - **Reason**: Simplifies the Three-Pass reflow math and ensures absolute coordinate stability.
    - **Standard**: All characters are assumed to be Width-1 (ASCII/Nerd Font) or explicitly handled via `Bun.stringWidth`.

---

## 🧪 Self-Validation Protocol

I will verify this implementation using an automated validation suite (`scripts/validate-box.ts`) which performs the following checks:

### 1. Zero-Trust Math Check
- Verify that a `width: 20` box with `border: 'default'` results in an inner content width of exactly `18`.
- Verify that `padding: [1, 2]` correctly adds `4` columns and `2` rows to the content area.

### 2. Percentage/Flex Consistency
- Verify that two `"1fr"` boxes in a `100` char space resolve to exactly `50` chars each.
- Verify that a `"50%"` box correctly handles rounding (floor vs ceil) to prevent gaps.

### 3. Edge Sharing Verification
- Verify that two adjacent boxes produce a single vertical line and not `||`.
- Verify that the intersection point is a valid junction glyph.

### 4. ANSI Integrity
- Verify that wrapping an ANSI-styled string doesn't result in "broken" colors at the boundary.

---

**Protocol Mandate**: No code will be reported as "Complete" until `bun scripts/validate-box.ts` returns a **TOTAL SUCCESS** signal. 🛰️🏁✨
