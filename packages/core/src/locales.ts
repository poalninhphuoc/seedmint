import { Faker, base, en, vi, ja, ko, zh_CN, th, id_ID, fr, de, es } from "@faker-js/faker";
import type { LocaleDefinition } from "@faker-js/faker";

export interface LocaleDef {
  code: string;
  faker: Faker;
  currency: string;
  /** Money range [min, max, step] in the locale's currency. */
  money: [number, number, number];
  custom: Custom;
}

export interface Custom {
  phone?: (f: Faker) => string;
  address?: (f: Faker) => string;
  street?: (f: Faker) => string;
  city?: (f: Faker) => string;
  province?: (f: Faker) => string;
  zip?: (f: Faker) => string;
  nationalId?: (f: Faker) => string;
  taxCode?: (f: Faker) => string;
  plate?: (f: Faker) => string;
  sentence?: (f: Faker) => string;
  paragraph?: (f: Faker) => string;
  word?: (f: Faker) => string;
  project?: (f: Faker) => string;
  team?: (f: Faker) => string;
  shift?: (f: Faker) => string;
  status?: (f: Faker) => string;
  stage?: (f: Faker) => string;
  lat?: (f: Faker) => number;
  lng?: (f: Faker) => number;
  /** Given name, family name and "family middle given" order of the locale (Vietnamese puts the family name first). */
  firstName?: (f: Faker) => string;
  lastName?: (f: Faker) => string;
  fullName?: (f: Faker) => string;
  productName?: (f: Faker) => string;
  categoryName?: (f: Faker) => string;
  /** Review text that agrees with its star rating (1-5), or with no rating when `null`. */
  review?: (f: Faker, rating: number | null) => string;
}

/** Name of the locale's own country, written in its language. */
export const COUNTRY: Record<string, string> = {
  en: "United States", vi: "Việt Nam", ja: "日本", ko: "대한민국", zh: "中国", th: "ประเทศไทย", id: "Indonesia", fr: "France", de: "Deutschland", es: "España",
};

const DEFS: Record<string, { def: LocaleDefinition; currency: string; money: [number, number, number] }> = {
  en: { def: en, currency: "USD", money: [1, 999, 0.01] },
  vi: { def: vi, currency: "VND", money: [10_000, 50_000_000, 1000] },
  ja: { def: ja, currency: "JPY", money: [100, 100_000, 10] },
  ko: { def: ko, currency: "KRW", money: [1000, 1_000_000, 100] },
  zh: { def: zh_CN, currency: "CNY", money: [5, 5000, 0.01] },
  th: { def: th, currency: "THB", money: [20, 20_000, 1] },
  id: { def: id_ID, currency: "IDR", money: [5000, 5_000_000, 500] },
  fr: { def: fr, currency: "EUR", money: [1, 999, 0.01] },
  de: { def: de, currency: "EUR", money: [1, 999, 0.01] },
  es: { def: es, currency: "EUR", money: [1, 999, 0.01] },
};

export const SUPPORTED_LOCALES = Object.keys(DEFS);

const pick = <T,>(f: Faker, arr: readonly T[]): T => f.helpers.arrayElement(arr as T[]);
const digits = (f: Faker, n: number) => f.string.numeric({ length: n, allowLeadingZeros: true });

const VI_PROVINCES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế", "Quảng Ninh", "Nghệ An", "Khánh Hòa", "Lâm Đồng", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu", "Thanh Hóa", "Quảng Nam", "Bắc Ninh", "Thái Nguyên", "Long An", "Kiên Giang", "Gia Lai"];
const VI_DISTRICTS = ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Tân Bình", "Cầu Giấy", "Đống Đa", "Hai Bà Trưng", "Thanh Xuân", "Hải Châu", "Ngô Quyền", "Ninh Kiều"];
const VI_WARDS = ["Phường Bến Nghé", "Phường Tân Định", "Phường 5", "Phường 12", "Phường Dịch Vọng", "Phường Láng Hạ", "Phường Thạch Thang", "Xã Tân Phú", "Phường Mỹ An"];
const VI_STREETS = ["Nguyễn Huệ", "Lê Lợi", "Trần Hưng Đạo", "Hai Bà Trưng", "Lý Thường Kiệt", "Nguyễn Trãi", "Điện Biên Phủ", "Phạm Văn Đồng", "Võ Văn Tần", "Cách Mạng Tháng Tám", "Lạc Long Quân", "Hoàng Diệu"];
const VI_FAMILY = ["Nguyễn", "Nguyễn", "Nguyễn", "Trần", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const VI_MID_M = ["Văn", "Hữu", "Đức", "Minh", "Quang", "Thanh", "Công", "Mạnh", "Gia", "Anh"];
const VI_MID_F = ["Thị", "Ngọc", "Thu", "Mai", "Khánh", "Phương", "Bảo", "Hồng", "Kim", "Diệu"];
const VI_GIVEN_M = ["Anh", "Bình", "Cường", "Dũng", "Hải", "Hùng", "Khoa", "Long", "Nam", "Phúc", "Quân", "Sơn", "Thắng", "Tuấn", "Việt", "Huy", "Đạt", "Hiếu", "Khang", "Nghĩa", "Trung", "Lộc"];
const VI_GIVEN_F = ["An", "Chi", "Dung", "Hà", "Hạnh", "Hoa", "Hương", "Lan", "Linh", "My", "Ngân", "Nhi", "Oanh", "Phương", "Thảo", "Trang", "Trinh", "Uyên", "Vy", "Yến", "Hằng", "Thủy", "Quỳnh"];
const viGiven = (f: Faker) => (f.datatype.boolean() ? pick(f, VI_GIVEN_M) : pick(f, VI_GIVEN_F));
const viFull = (f: Faker) => {
  const male = f.datatype.boolean();
  return `${pick(f, VI_FAMILY)} ${pick(f, male ? VI_MID_M : VI_MID_F)} ${pick(f, male ? VI_GIVEN_M : VI_GIVEN_F)}`;
};

const VI_CATEGORIES = ["Điện thoại", "Máy tính", "Thời trang nam", "Thời trang nữ", "Giày dép", "Đồng hồ", "Phụ kiện", "Mỹ phẩm", "Sức khỏe", "Nhà cửa & đời sống", "Thực phẩm", "Đồ uống", "Sách", "Đồ chơi", "Thể thao", "Mẹ & bé", "Thú cưng", "Điện gia dụng", "Văn phòng phẩm", "Xe cộ"];
const VI_PRODUCTS = ["Áo thun", "Áo sơ mi", "Quần jean", "Giày thể thao", "Túi xách", "Đồng hồ", "Tai nghe", "Bàn phím cơ", "Chuột không dây", "Balo laptop", "Bình giữ nhiệt", "Nồi chiên không dầu", "Máy xay sinh tố", "Sữa rửa mặt", "Kem chống nắng", "Son môi", "Ghế công thái học", "Đèn bàn", "Ốp lưng điện thoại", "Sạc dự phòng", "Cà phê rang xay", "Trà thảo mộc", "Dầu gội", "Sách kỹ năng"];
const VI_PRODUCT_MODS = ["cao cấp", "chính hãng", "phiên bản mới", "loại 1", "nhập khẩu", "dành cho nam", "dành cho nữ", "màu đen", "màu trắng", "bản giới hạn", "siêu bền", "tiết kiệm"];

const REVIEW_VI = {
  pos: ["Sản phẩm đúng như mô tả, chất lượng rất tốt.", "Giao hàng nhanh, đóng gói cẩn thận.", "Mình rất hài lòng, sẽ ủng hộ shop lần sau.", "Giá hợp lý so với chất lượng.", "Dùng vài tuần rồi vẫn rất bền.", "Nhân viên tư vấn nhiệt tình, dễ thương.", "Màu sắc đẹp, form chuẩn, dùng rất vừa.", "Chất lượng vượt mong đợi, đáng tiền.", "Đã mua lần thứ hai và vẫn rất ưng.", "Shop phản hồi nhanh, hỗ trợ tận tình."],
  neu: ["Dùng tạm ổn, đúng với tầm giá.", "Giao hàng hơi chậm nhưng hàng vẫn ổn.", "Chất lượng ở mức trung bình.", "Nhìn chung bình thường, chưa có gì nổi bật.", "Đóng gói ổn, sản phẩm khá giống mô tả.", "Mình cần dùng thêm thời gian để đánh giá."],
  neg: ["Sản phẩm không giống mô tả.", "Giao hàng chậm hơn dự kiến nhiều ngày.", "Chất lượng kém, dùng vài ngày đã hỏng.", "Đóng gói sơ sài, hộp bị móp.", "Shop phản hồi chậm, hỗ trợ chưa nhiệt tình.", "Giá hơi cao so với chất lượng.", "Màu sắc khác xa so với hình, hơi thất vọng.", "Mình sẽ không mua lại."],
};
const REVIEW_EN = {
  pos: ["Exactly as described and great quality.", "Fast delivery and careful packaging.", "Very happy with it, I will order again.", "Good value for the price.", "Still working perfectly after a few weeks.", "Support was friendly and quick to answer."],
  neu: ["Does the job, about what you expect for the price.", "Delivery was a bit slow but the item is fine.", "Average quality, nothing special.", "Packaging was fine and it matches the description."],
  neg: ["Not as described.", "Arrived much later than promised.", "Poor quality, it broke after a few days.", "Packaging was sloppy and the box was dented.", "Support was slow to respond.", "Overpriced for what you get."],
};
/** One to three sentences whose tone follows the star rating, never the same sentence twice. */
const reviewFrom = (pools: typeof REVIEW_VI) => (f: Faker, rating: number | null): string => {
  const take = (arr: string[], n: number) => f.helpers.arrayElements(arr, n);
  if (rating === null) return take([...pools.pos, ...pools.neu, ...pools.neg], 2).join(" ");
  if (rating >= 4) return [...take(pools.pos, f.number.int({ min: 1, max: 3 }))].join(" ");
  if (rating <= 2) return [...take(pools.neg, f.number.int({ min: 1, max: 2 }))].join(" ");
  return [...take(pools.neu, 1), ...take(f.datatype.boolean() ? pools.pos : pools.neg, 1)].join(" ");
};

const VI_SENTENCES = [
  "Sản phẩm chất lượng tốt, giao hàng nhanh và đóng gói cẩn thận.",
  "Giao diện dễ dùng, mình làm quen chỉ sau vài phút.",
  "Dịch vụ hỗ trợ nhiệt tình, phản hồi rất nhanh.",
  "Giá cả hợp lý so với những gì nhận được.",
  "Mình đã dùng được một tháng và rất hài lòng.",
  "Tính năng đầy đủ, phù hợp cho doanh nghiệp nhỏ.",
  "Cần cải thiện thêm tốc độ tải trang trên điện thoại.",
  "Thông tin hiển thị rõ ràng, dễ theo dõi và đối chiếu.",
];

const VI_WORDS = ["Kiểm tra định kỳ", "Hoàn thiện phần thô", "Giao vật tư", "Nghiệm thu hạng mục", "Bảo trì hệ thống", "Lắp đặt thiết bị", "Khảo sát mặt bằng", "Sửa chữa nhỏ", "Họp giao ban", "Vệ sinh công trình", "Đang xử lý", "Chờ phản hồi", "Hàng mới về", "Khách quen", "Ưu tiên cao"];
const VI_PROJECTS = ["Chung cư Sunrise Riverside", "Nhà máy Bình Dương 2", "Trung tâm thương mại Vincom", "Khu dân cư Phú Mỹ", "Trường tiểu học Hòa Bình", "Cầu vượt Ngã Tư Sở", "Bệnh viện Đa khoa Quận 7", "Khách sạn Biển Xanh", "Nhà xưởng KCN Long Hậu", "Biệt thự Thảo Điền"];

const CUSTOM: Record<string, Custom> = {
  vi: {
    firstName: viGiven,
    lastName: (f) => pick(f, VI_FAMILY),
    fullName: viFull,
    review: reviewFrom(REVIEW_VI),
    categoryName: (f) => pick(f, VI_CATEGORIES),
    productName: (f) => `${pick(f, VI_PRODUCTS)} ${pick(f, VI_PRODUCT_MODS)}`,
    word: (f) => pick(f, VI_WORDS),
    status: (f) => pick(f, ["Đang xử lý", "Hoàn thành", "Chờ duyệt", "Tạm dừng", "Đã hủy"]),
    stage: (f) => pick(f, ["Khảo sát", "Thiết kế", "Đang thi công", "Nghiệm thu", "Bảo hành"]),
    project: (f) => pick(f, VI_PROJECTS),
    team: (f) => `Đội thi công số ${f.number.int({ min: 1, max: 12 })}`,
    shift: (f) => pick(f, ["Ca sáng", "Ca chiều", "Ca tối", "Ca hành chính"]),
    lat: (f) => f.number.float({ min: 8.6, max: 21.5, fractionDigits: 6 }),
    lng: (f) => f.number.float({ min: 102.2, max: 109.3, fractionDigits: 6 }),
    phone: (f) => `0${pick(f, ["3", "5", "7", "8", "9"])}${digits(f, 8)}`,
    province: (f) => pick(f, VI_PROVINCES),
    city: (f) => pick(f, VI_PROVINCES),
    street: (f) => `${f.number.int({ min: 1, max: 300 })} ${pick(f, VI_STREETS)}`,
    address: (f) =>
      `${f.number.int({ min: 1, max: 300 })} ${pick(f, VI_STREETS)}, ${pick(f, VI_WARDS)}, ${pick(f, VI_DISTRICTS)}, ${pick(f, VI_PROVINCES)}`,
    zip: (f) => digits(f, 6),
    // 3-digit province code + century/gender digit + 2-digit birth year + 6 random digits
    nationalId: (f) => `0${digits(f, 2)}${f.number.int({ min: 0, max: 3 })}${digits(f, 2)}${digits(f, 6)}`,
    taxCode: (f) => digits(f, 10),
    plate: (f) => `${f.number.int({ min: 11, max: 99 })}${pick(f, ["A", "B", "C", "D", "E", "F"])}${f.number.int({ min: 1, max: 9 })}-${digits(f, 3)}.${digits(f, 2)}`,
    sentence: (f) => pick(f, VI_SENTENCES),
    paragraph: (f) => f.helpers.multiple(() => pick(f, VI_SENTENCES), { count: { min: 2, max: 4 } }).join(" "),
  },
  en: { review: reviewFrom(REVIEW_EN) },
  ja: { zip: (f) => `${digits(f, 3)}-${digits(f, 4)}` },
  ko: { zip: (f) => digits(f, 5) },
};

export function resolveLocales(input: string | string[]): LocaleDef[] {
  const codes = (Array.isArray(input) ? input : input.split(",")).map((c) => c.trim()).filter(Boolean);
  if (!codes.length) codes.push("en");
  return codes.map((raw) => {
    const code = raw.toLowerCase().split(/[-_]/)[0];
    const d = DEFS[code];
    if (!d) throw new Error(`Unsupported locale "${raw}". Supported: ${SUPPORTED_LOCALES.join(", ")}`);
    return {
      code,
      faker: new Faker({ locale: [d.def, en, base] }),
      currency: d.currency,
      money: d.money,
      custom: CUSTOM[code] ?? {},
    };
  });
}
