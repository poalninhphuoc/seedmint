import type { InputFormat } from "@seedmint/core";

export interface Sample {
  id: string;
  /** Input format shown next to the name in the picker. */
  format: InputFormat;
  schema: string;
}

const SHOP = `model User {
  id        Int       @id @default(autoincrement())
  name      String
  email     String    @unique
  phone     String?
  createdAt DateTime  @default(now())
  addresses Address[]
  orders    Order[]
  reviews   Review[]
}

model Address {
  id       Int     @id @default(autoincrement())
  userId   Int
  user     User    @relation(fields: [userId], references: [id])
  street   String
  city     String
  country  String
  zipCode  String
  isDefault Boolean
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String
  slug     String    @unique
  products Product[]
}

model Product {
  id         Int       @id @default(autoincrement())
  categoryId Int
  category   Category  @relation(fields: [categoryId], references: [id])
  name       String
  sku        String    @unique
  price      Float
  stock      Int
  createdAt  DateTime  @default(now())
  reviews    Review[]
}

model Order {
  id        Int         @id @default(autoincrement())
  userId    Int
  user      User        @relation(fields: [userId], references: [id])
  total     Float
  status    OrderStatus
  createdAt DateTime    @default(now())
  items     OrderItem[]
  payment   Payment?
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  quantity  Int
  unitPrice Float
}

model Payment {
  id      Int           @id @default(autoincrement())
  orderId Int           @unique
  order   Order         @relation(fields: [orderId], references: [id])
  amount  Float
  method  PaymentMethod
  paidAt  DateTime
}

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentMethod {
  CARD
  BANK_TRANSFER
  CASH
  WALLET
}
`;

const BLOG = `CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  bio TEXT,
  joined_at TIMESTAMP NOT NULL
);
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL
);
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INT NOT NULL REFERENCES authors(id),
  category_id INT NOT NULL REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  views INT NOT NULL,
  published_at TIMESTAMP
);
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(40) NOT NULL
);
CREATE TABLE post_tags (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id),
  tag_id INT NOT NULL REFERENCES tags(id)
);
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id),
  author_name VARCHAR(80) NOT NULL,
  author_email VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
`;

const HR = `CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  location VARCHAR(80)
);
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL
);
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  department_id INT NOT NULL REFERENCES departments(id),
  position_id INT NOT NULL REFERENCES positions(id),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(20),
  hired_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL
);
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  work_date DATE NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status VARCHAR(20) NOT NULL
);
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(200),
  status VARCHAR(20) NOT NULL
);
CREATE TABLE payroll (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id),
  month VARCHAR(7) NOT NULL,
  gross NUMERIC(12,2) NOT NULL,
  tax NUMERIC(12,2) NOT NULL,
  net NUMERIC(12,2) NOT NULL
);
`;

const SCHOOL = `Table teachers {
  id integer [pk]
  full_name varchar
  email varchar
  subject varchar
}
Table students {
  id integer [pk]
  full_name varchar
  email varchar
  birth_date date
  enrolled_at timestamp
}
Table courses {
  id integer [pk]
  teacher_id integer [ref: > teachers.id]
  title varchar
  credits integer
  room varchar
}
Table enrollments {
  id integer [pk]
  student_id integer [ref: > students.id]
  course_id integer [ref: > courses.id]
  enrolled_at timestamp
}
Table grades {
  id integer [pk]
  enrollment_id integer [ref: > enrollments.id]
  score decimal
  graded_at timestamp
}
Table attendance {
  id integer [pk]
  enrollment_id integer [ref: > enrollments.id]
  lesson_date date
  present boolean
}
`;

const CRM = `import { pgTable, serial, integer, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  employees: integer("employees"),
  createdAt: timestamp("created_at").notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  jobTitle: text("job_title"),
});

export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  pipelineId: integer("pipeline_id").notNull().references(() => pipelines.id),
  title: text("title").notNull(),
  amount: numeric("amount").notNull(),
  stage: text("stage").notNull(),
  closeDate: timestamp("close_date"),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  type: text("type").notNull(),
  note: text("note"),
  done: boolean("done").notNull(),
  dueAt: timestamp("due_at"),
});
`;

const CLINIC = `model Doctor {
  id        Int           @id @default(autoincrement())
  fullName  String
  specialty String
  email     String        @unique
  appointments Appointment[]
}

model Patient {
  id        Int           @id @default(autoincrement())
  fullName  String
  birthDate DateTime
  phone     String
  address   String?
  appointments Appointment[]
}

model Appointment {
  id        Int      @id @default(autoincrement())
  doctorId  Int
  doctor    Doctor   @relation(fields: [doctorId], references: [id])
  patientId Int
  patient   Patient  @relation(fields: [patientId], references: [id])
  scheduledAt DateTime
  status    String
  notes     String?
  prescriptions Prescription[]
}

model Medicine {
  id    Int    @id @default(autoincrement())
  name  String
  unit  String
  price Float
  prescriptions Prescription[]
}

model Prescription {
  id            Int         @id @default(autoincrement())
  appointmentId Int
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  medicineId    Int
  medicine      Medicine    @relation(fields: [medicineId], references: [id])
  dosage        String
  days          Int
}
`;

const CONSTRUCTION = `// Xây dựng / thi công: tên cột tiếng Việt, dùng với locale vi
interface KhachHang { id: number; tenKhachHang: string; soDienThoai: string; email: string; diaChi: string }
interface DuAn { id: number; khachHangId: number; tenDuAn: string; giaiDoan: "Khảo sát" | "Thiết kế" | "Đang thi công" | "Nghiệm thu" | "Bảo hành"; ngayBatDau: Date; ktDuKien: Date; giaTri: number }
interface NhanVien { id: number; hoVaTen: string; chucVu: string; soDienThoai: string; ngayVaoLam: Date }
interface PhanCong { id: number; duAnId: number; nhanVienId: number; vaiTro: string; soNgay: number }
interface VatTu { id: number; tenVatTu: string; donVi: string; donGia: number }
interface XuatVatTu { id: number; duAnId: number; vatTuId: number; soLuong: number; ngayXuat: Date }
interface HoaDon { id: number; duAnId: number; soTien: number; trangThai: "Chờ duyệt" | "Đã thanh toán" | "Quá hạn"; ngayLap: Date }
`;

const API = `openapi: 3.0.3
info: { title: Pet Clinic API, version: "1.0" }
paths: {}
components:
  schemas:
    Owner:
      type: object
      required: [id, name, email]
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        phone: { type: string }
    Pet:
      type: object
      required: [id, ownerId, name, species]
      properties:
        id: { type: integer }
        ownerId: { type: integer }
        name: { type: string }
        species: { type: string, enum: [dog, cat, bird, rabbit] }
        birthDate: { type: string, format: date }
        weightKg: { type: number }
    Vet:
      type: object
      required: [id, name]
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
    Visit:
      type: object
      required: [id, petId, vetId, visitedAt]
      properties:
        id: { type: integer }
        petId: { type: integer }
        vetId: { type: integer }
        visitedAt: { type: string, format: date-time }
        diagnosis: { type: string }
        cost: { type: number }
    Vaccination:
      type: object
      required: [id, petId, vaccine]
      properties:
        id: { type: integer }
        petId: { type: integer }
        vaccine: { type: string }
        givenAt: { type: string, format: date }
        nextDueAt: { type: string, format: date }
`;

const SOCIAL = `type User {
  id: ID!
  username: String!
  email: String!
  bio: String
  createdAt: DateTime!
}

type Post {
  id: ID!
  userId: ID!
  title: String!
  body: String!
  likes: Int!
  createdAt: DateTime!
}

type Comment {
  id: ID!
  postId: ID!
  userId: ID!
  text: String!
  createdAt: DateTime!
}

type Follow {
  id: ID!
  followerId: ID!
  followeeId: ID!
  createdAt: DateTime!
}

type Message {
  id: ID!
  senderId: ID!
  receiverId: ID!
  content: String!
  read: Boolean!
  sentAt: DateTime!
}
`;

const BOOKING = `import { z } from "zod";

export const hotelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  city: z.string(),
  stars: z.number().int(),
  email: z.string().email(),
});

export const roomSchema = z.object({
  id: z.number().int(),
  hotelId: z.number().int(),
  number: z.string(),
  type: z.enum(["single", "double", "suite"]),
  pricePerNight: z.number(),
});

export const guestSchema = z.object({
  id: z.number().int(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const bookingSchema = z.object({
  id: z.number().int(),
  roomId: z.number().int(),
  guestId: z.number().int(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  total: z.number(),
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

export const paymentSchema = z.object({
  id: z.number().int(),
  bookingId: z.number().int(),
  amount: z.number(),
  method: z.enum(["card", "cash", "transfer"]),
  paidAt: z.string().datetime(),
});
`;

const LOGISTICS = `warehouses(name, city, address, capacity:int)
products(name, sku, price:number, weight:number)
stock(warehouse_id, product_id, quantity:int)
carriers(name, email, phone)
shipments(carrier_id, warehouse_id, tracking_code, status, shipped_at:date)
shipment_items(shipment_id, product_id, quantity:int)
`;

/** Ready-made schemas for the Studio and Diagram "samples" menu. The first one is the default. */
export const SAMPLES: Sample[] = [
  { id: "shop", format: "prisma", schema: SHOP },
  { id: "blog", format: "sql", schema: BLOG },
  { id: "hr", format: "sql", schema: HR },
  { id: "school", format: "dbml", schema: SCHOOL },
  { id: "crm", format: "drizzle", schema: CRM },
  { id: "clinic", format: "prisma", schema: CLINIC },
  { id: "construction", format: "ts", schema: CONSTRUCTION },
  { id: "petApi", format: "openapi", schema: API },
  { id: "social", format: "graphql", schema: SOCIAL },
  { id: "booking", format: "zod", schema: BOOKING },
  { id: "logistics", format: "dsl", schema: LOGISTICS },
];

export const SAMPLE_SCHEMA = SAMPLES[0].schema;
