import { prisma } from "@/lib/prisma";

export const FREE_TIER_CAP_USD = Number(process.env.FREE_TIER_CAP_USD || "10");

export async function getTotalSpendUsd(userId: string): Promise<number> {
  const result = await prisma.usageEvent.aggregate({
    where: { userId },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd ?? 0;
}

export async function canGenerateRender(userId: string): Promise<{
  allowed: boolean;
  spendUsd: number;
  capUsd: number;
  isPro: boolean;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isPro = user?.plan === "pro";
  if (isPro) {
    return { allowed: true, spendUsd: 0, capUsd: FREE_TIER_CAP_USD, isPro };
  }
  const spendUsd = await getTotalSpendUsd(userId);
  return {
    allowed: spendUsd < FREE_TIER_CAP_USD,
    spendUsd,
    capUsd: FREE_TIER_CAP_USD,
    isPro,
  };
}

export async function recordUsage(params: {
  userId: string;
  renderId?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}) {
  return prisma.usageEvent.create({
    data: {
      userId: params.userId,
      renderId: params.renderId,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd: params.costUsd,
    },
  });
}
