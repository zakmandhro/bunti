import { expect, test, describe } from "bun:test";
import { box, joinHorizontal, visibleWidth, stripAnsi, truncate, list } from "../src/index";
import pc from "picocolors";

describe("Bunti Core Engine", () => {
  test("stripAnsi removes color codes", () => {
    const colored = pc.red("hello") + " " + pc.blue("world");
    expect(stripAnsi(colored)).toBe("hello world");
  });

  test("visibleWidth calculates correct length", () => {
    const colored = pc.bold(pc.green("✓")) + " Done";
    expect(visibleWidth(colored)).toBe(6);
  });

  test("box adds correct padding", () => {
    const b = box("hi", { padding: [0, 2] });
    expect(visibleWidth(b.split("\n")[0]!)).toBe(6); // "  hi  "
  });

  test("joinHorizontal aligns blocks correctly", () => {
    const b1 = box("left", { width: 10 });
    const b2 = box("right", { width: 10 });
    const joined = joinHorizontal(b1, b2);
    const lines = joined.split("\n");
    expect(visibleWidth(lines[0]!)).toBe(20);
  });

  test("truncate respects visible width and preserves ANSI", () => {
    const colored = pc.red("supercalifragilistic");
    const truncated = truncate(colored, 10);
    expect(visibleWidth(truncated)).toBe(10);
    expect(truncated).toContain("\x1b[31m"); // Should still have red code
  });

  test("list renders items with bullets and indentation", () => {
    const items = ["one", "two"];
    const out = list(items, { bullet: "- ", indent: 2 });
    expect(out).toBe("  - one\n  - two");
  });

  test("box respects maxWidth and truncates content", () => {
    const content = "this is a very long line that should be truncated";
    const b = box(content, { maxWidth: 20, border: 'normal' });
    const lines = b.split("\n");
    // border(1) + space(0) + content(18) + border(1) = 20
    expect(visibleWidth(lines[1]!)).toBe(20);
    expect(lines[1]).toContain("…");
  });
});
