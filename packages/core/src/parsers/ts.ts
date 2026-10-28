import ts from "typescript";
import type { Field, FieldKind, Schema, Table } from "../types.js";

interface Resolved {
  kind: FieldKind;
  enumValues?: string[];
  nullable: boolean;
}

function resolve(node: ts.TypeNode | undefined): Resolved {
  if (!node) return { kind: "string", nullable: false };
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { kind: "string", nullable: false };
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BigIntKeyword:
      return { kind: "number", nullable: false };
    case ts.SyntaxKind.BooleanKeyword:
      return { kind: "boolean", nullable: false };
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
      return { kind: "string", nullable: true };
  }
  if (ts.isParenthesizedTypeNode(node)) return resolve(node.type);
  if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) return { kind: "enum", enumValues: [node.literal.text], nullable: false };
    if (node.literal.kind === ts.SyntaxKind.NullKeyword) return { kind: "string", nullable: true };
    return { kind: "number", nullable: false };
  }
  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText();
    if (name === "Date") return { kind: "datetime", nullable: false };
    return { kind: "json", nullable: false };
  }
  if (ts.isUnionTypeNode(node)) {
    const parts = node.types.map(resolve);
    const nullable = parts.some((p) => p.nullable);
    const real = parts.filter((p) => !(p.nullable && p.kind === "string" && !p.enumValues));
    if (real.length && real.every((p) => p.kind === "enum")) {
      return { kind: "enum", enumValues: real.flatMap((p) => p.enumValues ?? []), nullable };
    }
    return { ...(real[0] ?? { kind: "string" as FieldKind }), nullable };
  }
  return { kind: "json", nullable: false };
}

function fieldsOf(members: ts.NodeArray<ts.TypeElement>, sf: ts.SourceFile): Field[] {
  const fields: Field[] = [];
  for (const m of members) {
    if (!ts.isPropertySignature(m)) continue;
    const name = m.name.getText(sf).replace(/^["'`]|["'`]$/g, "");
    const r = resolve(m.type);
    fields.push({
      name,
      kind: r.kind,
      enumValues: r.enumValues,
      optional: !!m.questionToken || r.nullable,
    });
  }
  return fields;
}

export function parseTs(src: string): Schema {
  const sf = ts.createSourceFile("input.ts", src, ts.ScriptTarget.Latest, true);
  const tables: Table[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node)) {
      tables.push({ name: node.name.text, fields: fieldsOf(node.members, sf) });
    } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      tables.push({ name: node.name.text, fields: fieldsOf(node.type.members, sf) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { tables };
}
