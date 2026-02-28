import { PrismaClient } from "@prisma/client";

export function buildNis(year: number, sequence: number): string {
  return `NS${year}${String(sequence).padStart(4, "0")}`;
}

export async function getNextNisSequence(prisma: PrismaClient): Promise<number> {
  const year = new Date().getFullYear();
  const prefix = `NS${year}`;

  const latest = await prisma.santri.findFirst({
    where: {
      nis: {
        startsWith: prefix,
      },
    },
    orderBy: {
      nis: "desc",
    },
    select: { nis: true },
  });

  if (!latest) return 1;

  const numeric = Number(latest.nis.slice(prefix.length));
  if (Number.isNaN(numeric) || numeric < 1) return 1;
  return numeric + 1;
}
