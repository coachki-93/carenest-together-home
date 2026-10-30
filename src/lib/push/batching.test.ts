import { describe, expect, it } from "vitest";
import { chunk, fetchAllPages, fetchInChunks } from "./batching";

describe("fetchAllPages", () => {
  it("fetches all 2500 masters across pages (no 1000 cap)", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => ({ id: `m${i}` }));
    const calls: [number, number][] = [];
    const { rows, error } = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(error).toBeNull();
    expect(rows).toHaveLength(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("exactly 1000 rows needs a confirming empty page", async () => {
    const all = Array.from({ length: 1000 }, (_, i) => i);
    const { rows } = await fetchAllPages(async (f, t) => ({ data: all.slice(f, t + 1), error: null }));
    expect(rows).toHaveLength(1000);
  });
  it("reports an error from any page", async () => {
    const { error } = await fetchAllPages(async (f) =>
      f === 0
        ? { data: Array(1000).fill(0), error: null }
        : { data: null, error: { message: "boom" } },
    );
    expect(error?.message).toBe("boom");
  });
});

describe("fetchInChunks", () => {
  it("splits 250 ids into chunks of 100, 100, 50", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `m${i}`);
    const sizes: number[] = [];
    const { rows, failedIds } = await fetchInChunks(ids, async (c) => {
      sizes.push(c.length);
      return { data: c.map((id) => ({ parent: id })), error: null };
    });
    expect(sizes).toEqual([100, 100, 50]);
    expect(rows).toHaveLength(250);
    expect(failedIds.size).toBe(0);
  });
  it("a failed chunk marks exactly its ids as failed", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `m${i}`);
    let n = 0;
    const { rows, failedIds, errors } = await fetchInChunks(ids, async (c) =>
      n++ === 1 ? { data: null, error: { message: "x" } } : { data: c, error: null },
    );
    expect(rows).toHaveLength(100);
    expect(failedIds.size).toBe(50);
    expect(failedIds.has("m100")).toBe(true);
    expect(failedIds.has("m99")).toBe(false);
    expect(errors).toEqual(["x"]);
  });
  it("chunk() is exact", () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});
