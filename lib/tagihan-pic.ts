import { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TagihanPicModeValue = "GLOBAL" | "BY_GENDER" | "BY_KELAS";

type MasterPicConfig = {
  picMode: TagihanPicModeValue;
  picGlobalUserId: string | null;
  picPutraUserId: string | null;
  picPutriUserId: string | null;
  picKelas: Array<{ kelasId: string; picUserId: string | null }>;
};

type TargetInput = Array<{ santriId: string; nominal: number }>;

export async function resolvePicForTargets(
  master: MasterPicConfig,
  targets: TargetInput,
): Promise<Array<{ santriId: string; nominal: number; picUserId: string | null }>> {
  if (!targets.length) return [];

  const santriRows = await prisma.santri.findMany({
    where: { id: { in: targets.map((t) => t.santriId) } },
    select: { id: true, gender: true, kelasId: true },
  });
  const santriMap = new Map(santriRows.map((s) => [s.id, s]));
  const kelasMap = new Map(master.picKelas.map((k) => [k.kelasId, k.picUserId]));

  return targets.map((t) => {
    const santri = santriMap.get(t.santriId);
    if (!santri) return { ...t, picUserId: master.picGlobalUserId || master.picPutraUserId || null };

    const resolvedGender = santri.gender || Gender.L;
    let picUserId: string | null = null;

    if (master.picMode === "GLOBAL") {
      picUserId = master.picGlobalUserId || null;
    } else if (master.picMode === "BY_GENDER") {
      picUserId = resolvedGender === Gender.P
        ? master.picPutriUserId || master.picGlobalUserId || master.picPutraUserId || null
        : master.picPutraUserId || master.picGlobalUserId || null;
    } else if (master.picMode === "BY_KELAS") {
      picUserId = kelasMap.get(santri.kelasId) || master.picGlobalUserId || master.picPutraUserId || null;
    }

    return {
      ...t,
      picUserId,
    };
  });
}
