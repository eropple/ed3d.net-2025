import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  const jwks = await locals.deps.atprotoService.getJWKS();

  return new Response(JSON.stringify(jwks), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};