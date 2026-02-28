import { DiskonEligibilityRule, PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: UserRole.ADMIN, active: true },
    create: { username, passwordHash, role: UserRole.ADMIN, active: true },
  });

  const kategoriDefaults = [
    {
      kode: "BERSAUDARA_2",
      nama: "2 Bersaudara",
      eligibilityRule: DiskonEligibilityRule.SIBLING_FAMILY,
      siblingCountMin: 2,
    },
    {
      kode: "BERSAUDARA_3",
      nama: "3 Bersaudara",
      eligibilityRule: DiskonEligibilityRule.SIBLING_FAMILY,
      siblingCountMin: 3,
    },
    {
      kode: "BERSAUDARA_4_PLUS",
      nama: "4 Bersaudara atau Lebih",
      eligibilityRule: DiskonEligibilityRule.SIBLING_FAMILY,
      siblingCountMin: 4,
    },
    {
      kode: "YATIM",
      nama: "Diskon Yatim",
      eligibilityRule: DiskonEligibilityRule.SANTRI_YATIM,
      siblingCountMin: null,
    },
    {
      kode: "KELUARGA_NDALEM",
      nama: "Diskon Keluarga Ndalem",
      eligibilityRule: DiskonEligibilityRule.SANTRI_KELUARGA_NDALEM,
      siblingCountMin: null,
    },
  ];

  for (const kategori of kategoriDefaults) {
    await prisma.diskonKategori.upsert({
      where: { kode: kategori.kode },
      update: {
        nama: kategori.nama,
        eligibilityRule: kategori.eligibilityRule,
        siblingCountMin: kategori.siblingCountMin,
        active: true,
      },
      create: {
        kode: kategori.kode,
        nama: kategori.nama,
        eligibilityRule: kategori.eligibilityRule,
        siblingCountMin: kategori.siblingCountMin,
        active: true,
      },
    });
  }

  console.log(`Admin seeded: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
