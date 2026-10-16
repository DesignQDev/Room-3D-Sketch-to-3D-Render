-- AlterTable
ALTER TABLE "Sketch" DROP COLUMN "heightMeters",
DROP COLUMN "notes",
DROP COLUMN "widthMeters",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "viewStyle" TEXT;

-- AlterTable
ALTER TABLE "Render" DROP COLUMN "sceneJson",
ADD COLUMN     "imageData" TEXT,
ADD COLUMN     "imageMime" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "shareToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ALTER COLUMN "source" SET DEFAULT 'openrouter';

-- CreateIndex
CREATE UNIQUE INDEX "Render_shareToken_key" ON "Render"("shareToken");

