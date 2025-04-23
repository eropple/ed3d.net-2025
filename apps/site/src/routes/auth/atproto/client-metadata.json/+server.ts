import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  const metadata = await locals.deps.atprotoService.getClientMetadata();

  return new Response(JSON.stringify(metadata), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};