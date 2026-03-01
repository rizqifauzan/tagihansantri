const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.tagihan.updateMany({
    where: {
      nominal: { lte: 0 },
      status: { in: ["TERBIT", "SEBAGIAN"] },
    },
    data: { status: "LUNAS" },
  });

  console.log(`Updated ${result.count} tagihan ke status LUNAS`);
}

main()
  .catch((error) => {
    console.error("Backfill gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
