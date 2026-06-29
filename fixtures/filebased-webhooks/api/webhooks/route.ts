// File-based routing (Medusa / Next.js App Router): exported verb functions in route.ts.
// The adapter derives the path from the directory: /api/webhooks/route.ts -> POST /webhooks.
export async function GET(): Promise<unknown[]> {
  return [];
}

export async function POST(req: { body: unknown }): Promise<unknown> {
  return { id: 1, payload: req.body };
}
