import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

export const ErrorResponse = schemaType(
  "ErrorResponse",
  Type.Object(
    {
      name: Type.String(),
      message: Type.String(),
      reqId: Type.String(),
      stack: Type.Optional(Type.String()),
    },
    {
      description: "An error response, for when something unexpected happened.",
    },
  ),
);
export type ErrorResponse = Static<typeof ErrorResponse>;

export const OKResponse = schemaType(
  "OKResponse",
  Type.Object(
    {
      ok: Type.Literal(true),
    },
    {
      description:
        "A generic OK response. This will rarely be used directly, and often as a response to a request that doesn't return anything.",
    },
  ),
);
export type OKResponse = Static<typeof OKResponse>;

export const RedirectResponse = schemaType(
  "RedirectResponse",
  Type.Object(
    {
      redirect: Type.String({ format: "uri" }),
    },
    {
      description:
        "A generic redirect response. Browsers will receive a Location header, too.",
    },
  ),
);
export type RedirectResponse = Static<typeof RedirectResponse>;

export const EmptyObject = schemaType(
  "EmptyObject",
  Type.Object(
    {
      ok: Type.Optional(Type.Literal(true)),
    },
    {
      description:
        "An empty object. This is used when a response is expected but not needed. Our content parser is sad so you can put an arbitrary thing into it to make it shut up.",
    },
  ),
);
export type EmptyObject = Static<typeof EmptyObject>;
