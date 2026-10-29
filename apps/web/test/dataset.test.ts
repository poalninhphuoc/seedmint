import { describe, expect, it } from "vitest";
import { autoName, sameDatabase } from "../src/lib/history";
import { choices, coerce, deleteRow, insertRow, isAutoId, kindOf, nextId, referencing, toCsv, toJson, updateRow, type Dataset } from "../src/lib/dataset";

const data: Dataset = {
  schema: "s",
  at: "2026-01-01T00:00:00.000Z",
  tables: [
    { name: "User", columns: ["id", "name", "active"], refs: [null, null, null], rows: [[1, "Ann", true], [2, "Bo, Jr", false]] },
    { name: "Post", columns: ["id", "userId", "title"], refs: [null, { table: "User", field: "id" }, null], rows: [[1, 1, "Hi"], [2, 1, "Yo"], [3, 2, null]] },
  ],
};
const [user, post] = data.tables;

describe("dataset", () => {
  it("infers column kinds and numbers ids", () => {
    expect(kindOf(user, 0)).toBe("number");
    expect(kindOf(user, 2)).toBe("boolean");
    expect(kindOf(user, 1)).toBe("string");
    expect(isAutoId(user, 0)).toBe(true);
    expect(isAutoId(post, 1)).toBe(false);
    expect(nextId(post, 0)).toBe(4);
  });

  it("coerces form text and rejects bad values", () => {
    expect(coerce("12", "number")).toBe(12);
    expect(coerce("", "number")).toBeNull();
    expect(coerce("x", "number")).toBeUndefined();
    expect(coerce("true", "boolean")).toBe(true);
    expect(coerce("yes", "boolean")).toBeUndefined();
    expect(coerce(" a ", "string")).toBe(" a ");
  });

  it("inserts, updates and deletes without touching the original", () => {
    const a = insertRow(data, "User", [3, "Cy", true]);
    expect(a.tables[0].rows).toHaveLength(3);
    expect(user.rows).toHaveLength(2);
    expect(updateRow(a, "User", 0, [1, "Zed", true]).tables[0].rows[0][1]).toBe("Zed");
    expect(deleteRow(a, "User", 2).tables[0].rows).toHaveLength(2);
  });

  it("finds the rows that still point at a row", () => {
    expect(referencing(data, "User", 0)).toEqual([{ table: "Post", count: 2 }]);
    expect(referencing(data, "User", 1)).toEqual([{ table: "Post", count: 1 }]);
    expect(referencing(data, "Post", 0)).toEqual([]);
  });

  it("lists values a foreign key can take", () => {
    expect(choices(data, { table: "User", field: "id" })).toEqual([1, 2]);
  });

  it("exports CSV with quoting and JSON by table", () => {
    expect(toCsv(user)).toBe('id,name,active\n1,Ann,true\n2,"Bo, Jr",false');
    expect(JSON.parse(toJson(data)).Post[2]).toEqual({ id: 3, userId: 2, title: null });
  });
});

describe("projects", () => {
  it("groups versions that share half their tables", () => {
    expect(sameDatabase(["A", "B", "C"], ["A", "B", "D"])).toBe(true);
    expect(sameDatabase(["A", "B"], ["C", "D"])).toBe(false);
    expect(sameDatabase([], [])).toBe(false);
  });

  it("names a database after its first tables", () => {
    expect(autoName(["A", "B"])).toBe("A, B");
    expect(autoName(["A", "B", "C", "D", "E"])).toBe("A, B, C +2");
  });
});
