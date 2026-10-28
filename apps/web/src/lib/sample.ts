export const SAMPLE_SCHEMA = `model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  phone     String?
  address   String?
  createdAt DateTime @default(now())
  orders    Order[]
}

model Order {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  total     Float
  status    String
  createdAt DateTime @default(now())
}
`;
