import nodemailer from "nodemailer";
import type { Logger } from "pino";
import type { DeepReadonly } from "utility-types";

import { type EmailDeliveryConfig } from "./config.js";

export type EmailContent = {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  // Add other nodemailer options as needed
};

export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;
  private defaultReplyTo?: string;

  constructor(
    private readonly logger: Logger,
    private readonly config: DeepReadonly<EmailDeliveryConfig>
  ) {
    this.logger = logger.child({ component: EmailService.constructor.name });

    this.defaultFrom = config.defaults.from;
    this.defaultReplyTo = config.defaults.replyTo;

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.tls,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass,
      },
    });

    this.logger.info("Email service initialized");
  }

  async sendEmail(content: EmailContent): Promise<{ messageId: string }> {
    try {
      const emailOptions = {
        ...content,
        from: content.from || this.defaultFrom,
        replyTo: content.replyTo || this.defaultReplyTo
      };

      this.logger.debug({
        to: emailOptions.to,
        from: emailOptions.from,
        subject: emailOptions.subject
      }, "Sending email");

      const info = await this.transporter.sendMail(emailOptions);

      this.logger.info(
        { messageId: info.messageId, to: emailOptions.to, subject: emailOptions.subject },
        "Email sent successfully"
      );

      return { messageId: info.messageId };
    } catch (err) {
      this.logger.error(
        { err, to: content.to, subject: content.subject },
        "Failed to send email"
      );
      throw err;
    }
  }
}
