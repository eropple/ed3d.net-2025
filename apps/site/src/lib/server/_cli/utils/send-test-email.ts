import { command, positional, string, option, optional } from "cmd-ts";

import { bootstrapNode } from "../../bootstrap/node.js";

export const sendTestEmailCommand = command({
  name: "send-test-email",
  args: {
    email: positional({
      type: string,
      displayName: "email",
      description: "Email address to send the test email to",
    }),
    subject: option({
      type: string,
      long: "subject",
      short: "s",
      defaultValue: () => "Test email from ed3d.net",
      description: "Subject of the test email",
    }),
    message: option({
      type: string,
      long: "message",
      short: "m",
      defaultValue: () => "This is a test email from the ed3d.net application.",
      description: "Content of the test email",
    }),
    from: option({
      type: optional(string),
      long: "from",
      description: "Override the default from address",
    }),
    replyTo: option({
      type: optional(string),
      long: "reply-to",
      description: "Override the default reply-to address",
    }),
  },
  handler: async ({ email, subject, message, from, replyTo }) => {
    const { ROOT_LOGGER, SINGLETON_CONTAINER } = await bootstrapNode(
      "cli-email-tester",
      {
        skipMigrations: true,
      },
    );

    try {
      ROOT_LOGGER.info({ email }, "Sending test email...");

      const emailService = SINGLETON_CONTAINER.cradle.emailService;

      const result = await emailService.sendEmail({
        to: email,
        from,
        replyTo,
        subject,
        text: message,
        html: `<p>${message}</p>`,
      });

      ROOT_LOGGER.info({ email, messageId: result.messageId }, "Test email sent successfully");
    } catch (err) {
      ROOT_LOGGER.error({ err, email }, "Failed to send test email");
      process.exit(1);
    }

    await SINGLETON_CONTAINER.dispose();
    process.exit(0);
  },
});
