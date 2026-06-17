import { PrismaClient } from "@prisma/client";
import { logger } from "./pino";

// Handle BigInt serialization for Express responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

let prisma: PrismaClient | null = null;
let initialized = false;

export function getPrisma(): PrismaClient | null {
  if (initialized) {
    return prisma;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.warn("DATABASE_URL env variable is missing. Database features will be disabled.");
    prisma = null;
    initialized = true;
    return prisma;
  }

  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
    logger.info("Prisma Client initialized.");
  } catch (error: any) {
    logger.error(`Failed to initialize Prisma Client: ${error.message || error}`);
    prisma = null;
  }

  initialized = true;
  return prisma;
}
