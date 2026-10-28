import type { Field } from "./types.js";

export type Semantic =
  | "id" | "uuid" | "enum" | "bool" | "flag" | "json"
  | "email" | "phone" | "firstName" | "lastName" | "fullName" | "companyName" | "productName" | "categoryName"
  | "username" | "password" | "image" | "avatar" | "url" | "address" | "street" | "city" | "province" | "country"
  | "zip" | "jobTitle" | "title" | "paragraph" | "sentence" | "slug" | "color" | "ip" | "currencyCode" | "lat" | "lng"
  | "sku" | "nationalId" | "taxCode" | "plate" | "gender" | "status" | "role" | "language" | "word"
  | "money" | "rating" | "age" | "quantity" | "percent" | "year" | "int" | "float"
  | "birthdate" | "createdAt" | "updatedAt" | "future" | "anyDate";

const KNOWN = new Set<string>([
  "email", "phone", "firstName", "lastName", "fullName", "companyName", "username", "password", "image", "avatar",
  "url", "address", "street", "city", "province", "country", "zip", "jobTitle", "title", "paragraph", "sentence",
  "slug", "color", "ip", "currencyCode", "lat", "lng", "sku", "nationalId", "taxCode", "plate", "gender", "status",
  "role", "language", "word", "money", "rating", "age", "quantity", "percent", "year", "birthdate",
]);

const HINT_ALIAS: Record<string, Semantic> = {
  name: "fullName", photo: "image", picture: "image", website: "url", link: "url", text: "paragraph",
  description: "paragraph", company: "companyName", product: "productName", category: "categoryName",
  price: "money", amount: "money", cccd: "nationalId", mst: "taxCode", tel: "phone", mobile: "phone", ward: "province",
};

const snake = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();

function byName(table: string, n: string, numeric: boolean): Semantic | undefined {
  const t = table.toLowerCase();
  if (numeric) {
    if (/(price|amount|total|cost|fee|salary|balance|revenue|subtotal|budget)/.test(n)) return "money";
    if (/(rating|score|stars)/.test(n)) return "rating";
    if (/^age$|_age$/.test(n)) return "age";
    if (/(quantity|qty|count|stock|inventory|views|likes)/.test(n)) return "quantity";
    if (/(percent|rate|discount|progress)/.test(n)) return "percent";
    if (/^(lat|latitude)$/.test(n)) return "lat";
    if (/^(lng|lon|longitude)$/.test(n)) return "lng";
    if (/year/.test(n)) return "year";
    return undefined;
  }
  if (/e_?mail/.test(n)) return "email";
  if (/(phone|mobile|tel$|hotline|fax)/.test(n)) return "phone";
  if (/(first_name|given_name|firstname)/.test(n)) return "firstName";
  if (/(last_name|surname|family_name|lastname)/.test(n)) return "lastName";
  if (/(full_name|display_name|fullname)/.test(n)) return "fullName";
  if (/^(user_?name|handle|login|nickname)$/.test(n)) return "username";
  if (/(password|passwd|hash|secret|token)/.test(n)) return "password";
  if (/(avatar|profile_?(image|pic))/.test(n)) return "avatar";
  if (/(image|photo|picture|thumbnail|logo|cover|banner|icon)/.test(n)) return "image";
  if (/(url|website|link|homepage|href)/.test(n)) return "url";
  if (/(cccd|national_id|citizen|identity|id_card|passport)/.test(n)) return "nationalId";
  if (/(tax_?(code|id)|^mst$|vat)/.test(n)) return "taxCode";
  if (/(plate|license_?no)/.test(n)) return "plate";
  if (/(street|address_line)/.test(n)) return "street";
  if (/address/.test(n)) return "address";
  if (/(city|town)/.test(n)) return "city";
  if (/(province|state|region|district|ward|county)/.test(n)) return "province";
  if (/country/.test(n)) return "country";
  if (/(zip|postal|post_?code)/.test(n)) return "zip";
  if (/(company|organization|organisation|employer|business|brand|vendor|supplier)/.test(n)) return "companyName";
  if (/(job|position|occupation)/.test(n)) return "jobTitle";
  if (/^role$|_role$/.test(n)) return "role";
  if (/status|state$/.test(n)) return "status";
  if (/gender|sex/.test(n)) return "gender";
  if (/(lang|locale)/.test(n)) return "language";
  if (/currency/.test(n)) return "currencyCode";
  if (/slug/.test(n)) return "slug";
  if (/colou?r/.test(n)) return "color";
  if (/(^ip$|ip_address)/.test(n)) return "ip";
  if (/(sku|barcode|code$)/.test(n)) return "sku";
  if (/(^lat$|latitude)/.test(n)) return "lat";
  if (/(^lng$|^lon$|longitude)/.test(n)) return "lng";
  if (/(title|subject|headline)/.test(n)) return "title";
  if (/(description|summary|bio|about|content|body|note|comment|message|review|text|detail)/.test(n)) return "paragraph";
  if (/category|tag|^type$|genre/.test(n)) return "categoryName";
  if (n === "name" || n.endsWith("_name")) {
    if (/(product|item|good|dish|menu|course|book|movie)/.test(t) || /(product|item)_name/.test(n)) return "productName";
    if (/(company|org|business|brand|vendor|supplier|store|shop|restaurant|hotel)/.test(t)) return "companyName";
    if (/(categor|tag|department|team|group)/.test(t)) return "categoryName";
    return "fullName";
  }
  return undefined;
}

export function inferSemantic(table: string, f: Field): Semantic {
  if (f.enumValues?.length) return "enum";
  if (f.kind === "enum") return "status";
  if (f.kind === "uuid") return "uuid";
  if (f.primary && f.kind !== "string") return "id";
  if (f.hint) {
    if (KNOWN.has(f.hint)) return f.hint as Semantic;
    if (HINT_ALIAS[f.hint]) return HINT_ALIAS[f.hint];
  }
  const n = snake(f.name);

  if (f.kind === "boolean") return /^(is|has|can)_|active|enabled|verified|published/.test(n) ? "flag" : "bool";
  if (f.kind === "json") return "json";
  if (f.kind === "date" || f.kind === "datetime") {
    if (/(birth|dob)/.test(n)) return "birthdate";
    if (/(created|joined|registered|signup|sign_up)/.test(n)) return "createdAt";
    if (/(updated|modified|last_)/.test(n)) return "updatedAt";
    if (/(expire|due|end|deadline|valid_until|next)/.test(n)) return "future";
    return "anyDate";
  }
  const numeric = f.kind === "integer" || f.kind === "number";
  const named = byName(table, n, numeric);
  if (named) return named;
  if (f.primary) return "id";
  if (numeric) return f.kind === "integer" ? "int" : "float";
  return "word";
}
