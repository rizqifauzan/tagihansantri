import { Gender, Prisma, SantriStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RuleCakupanType = "GLOBAL" | "KELAS" | "GENDER" | "SANTRI";
export type RuleTagihanStatus = "DRAFT" | "PUBLISHED";

export type RuleInput = {
  komponenId: string;
  nominal: number;
  cakupan: RuleCakupanType;
  kelasId?: string | null;
  gender?: Gender | null;
  santriId?: string | null;
};

export function validateRuleInput(input: RuleInput): string | null {
  if (!input.komponenId) return "Komponen wajib dipilih";
  if (Number.isNaN(input.nominal) || input.nominal <= 0) {
    return "Nominal harus lebih dari 0";
  }

  switch (input.cakupan) {
    case "GLOBAL":
      if (input.kelasId || input.gender || input.santriId) {
        return "Rule GLOBAL tidak boleh mengisi kelas/gender/santri";
      }
      break;
    case "KELAS":
      if (!input.kelasId) return "Rule KELAS wajib memilih kelas";
      if (input.gender || input.santriId) {
        return "Rule KELAS tidak boleh mengisi gender/santri";
      }
      break;
    case "GENDER":
      if (!input.gender) return "Rule GENDER wajib memilih gender";
      if (input.kelasId || input.santriId) {
        return "Rule GENDER tidak boleh mengisi kelas/santri";
      }
      break;
    case "SANTRI":
      if (!input.santriId) return "Rule SANTRI wajib memilih santri";
      if (input.kelasId || input.gender) {
        return "Rule SANTRI tidak boleh mengisi kelas/gender";
      }
      break;
    default:
      return "Cakupan rule tidak valid";
  }

  return null;
}

function targetWhere(rule: {
  cakupan: RuleCakupanType;
  kelasId: string | null;
  gender: Gender | null;
  santriId: string | null;
}): Prisma.SantriWhereInput {
  switch (rule.cakupan) {
    case "GLOBAL":
      return { status: SantriStatus.AKTIF };
    case "KELAS":
      return { status: SantriStatus.AKTIF, kelasId: rule.kelasId || undefined };
    case "GENDER":
      return { status: SantriStatus.AKTIF, gender: rule.gender || undefined };
    case "SANTRI":
      return { status: SantriStatus.AKTIF, id: rule.santriId || undefined };
    default:
      return { status: SantriStatus.AKTIF };
  }
}

export async function hasPublishedConflict(
  newRule: {
    id?: string;
    komponenId: string;
    cakupan: RuleCakupanType;
    kelasId?: string | null;
    gender?: Gender | null;
    santriId?: string | null;
  },
): Promise<{ conflict: boolean; conflictingRuleId?: string }> {
  const candidates = await (prisma as any).ruleTagihan.findMany({
    where: {
      komponenId: newRule.komponenId,
      status: "PUBLISHED",
      ...(newRule.id ? { id: { not: newRule.id } } : {}),
    },
    select: {
      id: true,
      cakupan: true,
      kelasId: true,
      gender: true,
      santriId: true,
    },
  });

  const newWhere = targetWhere({
    cakupan: newRule.cakupan,
    kelasId: newRule.kelasId || null,
    gender: newRule.gender || null,
    santriId: newRule.santriId || null,
  });

  for (const candidate of candidates) {
    const overlap = await prisma.santri.findFirst({
      where: {
        AND: [newWhere, targetWhere(candidate)],
      },
      select: { id: true },
    });

    if (overlap) {
      return { conflict: true, conflictingRuleId: candidate.id };
    }
  }

  return { conflict: false };
}
