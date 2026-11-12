import { db } from "@/lib/db";
import { currentUserId } from "@/server/session";
import { factHandler } from "@/server/http";
import { createFactService } from "@/server/fact-service";
import { prismaFactStore } from "@/server/prisma-fact-store";
import { generateMovieFact } from "@/server/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;
export const GET = factHandler(currentUserId, createFactService(prismaFactStore(db), generateMovieFact));
