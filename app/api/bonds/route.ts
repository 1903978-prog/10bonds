import { answer } from "@/lib/bondsAnswer";

export const dynamic = "force-dynamic";

// The answer itself lives in lib/bondsAnswer.ts, so the progressive band stream (app/api/bonds/band-live) builds its steps the same way.
export const GET = (req: Request) => answer(req);
