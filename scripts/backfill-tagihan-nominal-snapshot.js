const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.$executeRaw`
    UPDATE "Tagihan"
    SET
      "nominalAwal" = "nominal",
      "nominalDiskon" = 0
    WHERE
      ("nominalAwal" = 0 OR "nominalAwal" IS NULL)
      AND ("nominalDiskon" = 0 OR "nominalDiskon" IS NULL)
  `;

  console.log(`Backfill nominal snapshot selesai. Updated rows: ${Number(updated || 0)}`);
}

main()
  .catch((error) => {
    console.error("Backfill gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
