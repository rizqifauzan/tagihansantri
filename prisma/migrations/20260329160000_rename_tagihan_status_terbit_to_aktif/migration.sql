-- Rename enum value TagihanStatus.TERBIT -> AKTIF
-- This keeps existing rows valid and aligns with new app enum.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'TagihanStatus' AND e.enumlabel = 'TERBIT'
  ) THEN
    ALTER TYPE "TagihanStatus" RENAME VALUE 'TERBIT' TO 'AKTIF';
  END IF;
END $$;

-- Ensure default for Tagihan.status follows new enum value.
ALTER TABLE "Tagihan"
  ALTER COLUMN "status" SET DEFAULT 'AKTIF';
