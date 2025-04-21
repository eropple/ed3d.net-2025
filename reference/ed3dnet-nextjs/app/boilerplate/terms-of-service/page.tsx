import { type Metadata } from "next";
import Link from "next/link";
import React from "react";

import "../../long-form.css";
import { SITE_NAME } from "../../../lib/constants";
import { defaultMetadata } from "../../metadata";

export function generateMetadata(): Metadata {
  return {
    ...defaultMetadata(),
    title: SITE_NAME,
    description: "Terms of service for ed3d.net.",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `Terms of Service | ${SITE_NAME}`,
    },
    twitter: {
      creator: "@edropple",
      card: "summary",
      site: SITE_NAME,
      description: "Terms of service for ed3d.net.",
    },
  };
}

export default async function TermsOfService() {
  return (
    <div className="long-form-content">
      <h1 className="text-2xl">ed3d.net Terms of Service</h1>
      <p>
        <em>Last updated: 14 October 2023</em>
      </p>
      <p>
        Privacy contact:{" "}
        <a href="mailto:ed+terms@ed3d.net">ed+terms@ed3d.net</a>
      </p>

      <h2>1. Scope</h2>
      <p>
        These terms of service cover your use of the website at ed3d.net and any
        subdomains thereof (the &quot;Site&quot;). ed3d.net is operated by Ed
        Ropple via TRACE COMPLETE HEAVY INDUSTRIES LLC, a Delaware-registered
        limited liability company (the &quot;Proprietor&quot;).
      </p>
      <h2>2. Acceptance of Terms</h2>
      <p>
        By accessing the Site, you agree to be bound by these terms of service.
        If you do not agree to these terms of service, you may not access the
        Site.
      </p>
      <h2>3. License to Use</h2>
      <p>
        The Proprietor grants you a non-exclusive, non-transferable, revocable
        license to use the Site, in accordance with these terms of service. You
        may not use the Site for any purpose other than that for which it is
        intended.
      </p>
      <h2>4. Cookies</h2>
      <p>
        The Site uses cookies to store session information. You may block
        cookies by disabling them in your browser.
      </p>
      <h2>5. Acceptable Use</h2>
      <p>
        You may not use the Site in any way that violates these terms of
        service. You may not use the Site in any way that violates any
        applicable law or regulation. You may not use the Site in any way that
        violates the rights of any other person or entity, and you may not use
        the Site in any way that is, at the Proprietor&apos;s sole discretion,
        harmful, fraudulent, deceptive, threatening, harassing, defamatory,
        obscene, or otherwise objectionable.
      </p>
      <p>
        You may not use any page on this site as training data for machine
        learning models.
      </p>
      <h2>6. Privacy</h2>
      <p>
        Consult the Site&apos;s{" "}
        <Link href="/boilerplate/privacy-policy">privacy policy</Link> for
        information on how the Proprietor handles your data.
      </p>
      <h2>7. User Accounts</h2>
      <p>
        You may create a user account on the Site. You are responsible for
        maintaining the security of your account and password. The Proprietor
        cannot and will not be liable for any loss or damage from your failure
        to comply with this security obligation.
      </p>
      <p>
        You are responsible for all content posted and activity that occurs
        under your account. You may not use another person&apos;s account
        without permission of the Proprietor. (You will not receive this
        permission.)
      </p>
      <h2>8. User Content and Rights</h2>
      <p>
        By providing user-made content to the site (including but not limited to
        comments, forum posts, and user-generated content), you grant the
        Proprietor a non-exclusive, worldwide, perpetual, irrevocable,
        royalty-free, sublicensable right to duplicate, modify for length,
        distribute, display, and perform that content in any media. (You own
        your content and continue to own your content; you agree not to sue us
        for replicating it in other blog posts, in a book that quotes your
        comment, etc.)
      </p>
      <h2>9. Modification and Termination</h2>
      <p>
        The Proprietor reserves the right to modify, suspend, or discontinue the
        Site at any time, for any reason, without notice.
      </p>
      <p>
        The Proprietor reserves the right to modify these terms of service at
        any time, for any reason, without notice. Your continued use of the Site
        after any such modifications constitutes your acceptance of the new
        terms of service.
      </p>
      <h2>10. Revocation</h2>
      <p>
        The Proprietor reserves the right to terminate your access to the Site
        or the specific termination of your user account at any time, for any
        reason, without notice.
      </p>
      <h2>11. Disclaimers</h2>
      <p>
        The Site is provided on an &quot;as-is&quot; and
        &quot;as-available&quot; basis.
      </p>
      <p>
        All information on this site purported to be non-fictional is attested
        to be true to the best of the Proprietor&apos;s knowledge, but this is a
        website on the internet. If something seems wrong, it could be. Use your
        brain.
      </p>
    </div>
  );
}
