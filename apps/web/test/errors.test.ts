import { describe, expect, it } from "vitest";
import { errorKey } from "../src/lib/errors";
import { analyze, importFiles } from "../src/app/actions";

describe("errorKey", () => {
  it("maps known server messages to catalog keys", () => {
    expect(errorKey("Schema is empty.")?.key).toBe("schemaEmpty");
    expect(errorKey("Schema is too large (3 MB max).")?.key).toBe("schemaTooLarge");
    expect(errorKey("No tables found in sql input.")).toEqual({ key: "noTables", values: { format: "sql" } });
    expect(errorKey("Could not detect the input format. Use --from ts|zod")?.key).toBe("detectFailed");
  });
  it("keeps the parser's own wording as detail", () => {
    expect(errorKey("Unexpected token } in JSON")).toEqual({ key: "parseFailed", values: { detail: "Unexpected token } in JSON" } });
  });
  it("leaves unknown messages alone", () => {
    expect(errorKey("Something else broke")).toBeNull();
  });
  it("matches what the real actions return", async () => {
    const empty = await analyze({ schema: " ", from: "auto" });
    expect(!empty.ok && errorKey(empty.error)?.key).toBe("schemaEmpty");
    const none = await importFiles([{ path: "a.txt", content: "x" }]);
    expect(!none.ok && errorKey(none.error)?.key).toBe("noSchemaFiles");
  });
});
