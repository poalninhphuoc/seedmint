import type { Field } from "./types.js";

export type Semantic =
  | "id" | "uuid" | "enum" | "bool" | "flag" | "json"
  | "email" | "phone" | "firstName" | "lastName" | "fullName" | "companyName" | "productName" | "categoryName"
  | "username" | "password" | "image" | "avatar" | "url" | "address" | "street" | "city" | "province" | "country"
  | "zip" | "jobTitle" | "title" | "paragraph" | "sentence" | "slug" | "color" | "ip" | "currencyCode" | "lat" | "lng"
  | "sku" | "nationalId" | "taxCode" | "plate" | "gender" | "status" | "role" | "language" | "word"
  | "money" | "rating" | "age" | "quantity" | "percent" | "year" | "int" | "float"
  | "count" | "code" | "stage" | "dateStr" | "timeStr" | "projectName" | "teamName" | "shift"
  | "birthdate" | "createdAt" | "updatedAt" | "future" | "anyDate";

const KNOWN = new Set<string>([
  "email", "phone", "firstName", "lastName", "fullName", "companyName", "username", "password", "image", "avatar",
  "url", "address", "street", "city", "province", "country", "zip", "jobTitle", "title", "paragraph", "sentence",
  "slug", "color", "ip", "currencyCode", "lat", "lng", "sku", "nationalId", "taxCode", "plate", "gender", "status",
  "role", "language", "word", "money", "rating", "age", "quantity", "percent", "year", "birthdate",
  "count", "code", "stage", "dateStr", "timeStr", "projectName", "teamName", "shift",
]);

const HINT_ALIAS: Record<string, Semantic> = {
  name: "fullName", photo: "image", picture: "image", website: "url", link: "url", text: "paragraph",
  description: "paragraph", company: "companyName", product: "productName", category: "categoryName",
  price: "money", amount: "money", cccd: "nationalId", mst: "taxCode", tel: "phone", mobile: "phone", ward: "province",
};

const snake = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();

/** Vietnamese column names written without diacritics, e.g. hoVaTen, diaChi, ngaySinh. */
function byNameVi(n: string): Semantic | undefined {
  const w = (re: string) => new RegExp(`(^|_)(${re})($|_)`).test(n);
  if (/^ma(_[a-z0-9_]+)?$/.test(n)) return "code";
  if (w("so_dien_thoai|dien_thoai|sdt")) return "phone";
  if (w("mat_khau")) return "password";
  if (w("ho_va_ten|ho_ten|ten_nhan_vien|ten_khach_hang|nguoi_duyet|nguoi_tao|nguoi_dung|nguoi_nhan")) return "fullName";
  if (w("dia_chi")) return "address";
  if (w("hinh_anh|anh|anh_dai_dien")) return "image";
  if (w("khu_vuc|phuong|xa|quan|huyen|tinh")) return "province";
  if (w("thanh_pho")) return "city";
  if (w("trang_thai")) return "status";
  if (w("vai_tro|chuc_vu")) return "role";
  if (w("gioi_tinh")) return "gender";
  if (w("cong_ty|doanh_nghiep|nha_cung_cap")) return "companyName";
  if (w("ten_du_an|du_an")) return "projectName";
  if (w("doi_thi_cong|doi|to_doi|nhom")) return "teamName";
  if (w("ca_lam_viec|ca_lam|ca")) return "shift";
  if (w("ngay|ngay_[a-z]+")) return "dateStr";
  if (w("gio|gio_vao|gio_ra|gio_[a-z]+")) return "timeStr";
  if (w("giai_doan")) return "stage";
  if (w("tieu_de")) return "title";
  if (w("cong_viec")) return "word";
  if (w("ghi_chu|ly_do|lich_su[a-z_]*|mo_ta|noi_dung|chi_tiet|nhan_xet")) return "sentence";
  if (w("danh_muc|loai|the")) return "categoryName";
  if (w("ten")) return "fullName";
  return undefined;
}

function byName(table: string, n: string, numeric: boolean, isInt = false): Semantic | undefined {
  const t = table.toLowerCase();
  if (numeric) {
    if (isInt && !/tien|gia|luong$/.test(n) && /(^|_)(nhan_su|tuyen|cap|su_co|diem|tong_so)($|_)|(^|_)so_(?!luong)[a-z_]+|_count$|^num_/.test(n)) return "count";
    if (/(^|_)(vi_do)($|_)/.test(n)) return "lat";
    if (/(^|_)(kinh_do)($|_)/.test(n)) return "lng";
    if (/(price|amount|total|cost|fee|salary|balance|revenue|subtotal|budget|(^|_)(gia|tien|luong|thanh_tien|tong_tien|chi_phi|phi)($|_))/.test(n)) return "money";
    if (/(^|_)(diem|danh_gia)($|_)/.test(n)) return "rating";
    if (/(^|_)tuoi($|_)/.test(n)) return "age";
    if (/(^|_)(so_luong|ton_kho|luot_xem)($|_)/.test(n)) return "quantity";
    if (/(^|_)(phan_tram|ty_le|giam_gia)($|_)/.test(n)) return "percent";
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
  if (/(^|_)id$/.test(n)) return "uuid";
  const vi = byNameVi(n);
  if (vi) return vi;
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

  if (f.comment && f.kind === "string") {
    if (/y{2,4}[-/]m{2}[-/]d{2}|d{2}[-/]m{2}[-/]y{2,4}/i.test(f.comment)) return "dateStr";
    if (/h{2}:m{2}/i.test(f.comment)) return "timeStr";
  }
  if (f.kind === "boolean") return /^(is|has|can)_|active|enabled|verified|published/.test(n) ? "flag" : "bool";
  if (f.kind === "json") return "json";
  if (f.kind === "date" || f.kind === "datetime") {
    if (/(birth|dob)/.test(n)) return "birthdate";
    if (/(created|joined|registered|signup|sign_up)/.test(n)) return "createdAt";
    if (/(updated|modified|last_)/.test(n)) return "updatedAt";
    if (/(expire|due|end|deadline|valid_until|next|du_kien|ket_thuc|han_)/.test(n)) return "future";
    return "anyDate";
  }
  const numeric = f.kind === "integer" || f.kind === "number";
  const named = byName(table, n, numeric, f.kind === "integer");
  if (named) return named;
  if (f.primary) return "id";
  if (numeric) return f.kind === "integer" ? "int" : "float";
  return "word";
}
