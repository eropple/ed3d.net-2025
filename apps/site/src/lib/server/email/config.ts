import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const EmailDeliveryConfig = Type.Object({
  smtp: Type.Object({
    host: Type.String(),
    port: Type.Number(),
    tls: Type.Boolean(),
    auth: Type.Object({
      user: Type.String(),
      pass: Type.String()
    })
  }),
  defaults: Type.Object({
    from: Type.String({
      description: "Default from address for all emails",
      examples: ["ed @ ed3d <ed+automailer@ed3d.net>"]
    }),
    replyTo: Type.Optional(Type.String({
      description: "Default reply-to address for all emails",
      examples: ["ed @ ed3d <ed+automailer@ed3d.net>"]
    }))
  })
});

export type EmailDeliveryConfig = Static<typeof EmailDeliveryConfig>;
export const EmailDeliveryConfigChecker = TypeCompiler.Compile(EmailDeliveryConfig);
