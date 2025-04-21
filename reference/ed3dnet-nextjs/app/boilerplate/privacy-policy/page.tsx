import { type Metadata } from "next";
import React from "react";

import "../../long-form.css";
import { SITE_NAME } from "../../../lib/constants";
import { defaultMetadata } from "../../metadata";

export function generateMetadata(): Metadata {
  return {
    ...defaultMetadata(),
    title: SITE_NAME,
    description: "Privacy policy for ed3d.net.",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `Privacy Policy | ${SITE_NAME}`,
    },
    twitter: {
      creator: "@edropple",
      card: "summary",
      site: SITE_NAME,
      description: "Privacy policy for ed3d.net.",
    },
  };
}

export default async function PrivacyPolicy() {
  return (
    <div className="long-form-content">
      <h1 className="text-2xl">ed3d.net Privacy Policy</h1>
      <p>
        <em>Last updated: 14 October 2023</em>
      </p>
      <p>
        Privacy contact:{" "}
        <a href="mailto:ed+privacy@ed3d.net">ed+privacy@ed3d.net</a>
      </p>

      <h2>1. Scope</h2>
      <p>
        This privacy policy covers your use of the website at ed3d.net and any
        subdomains thereof (the &quot;Site&quot;). ed3d.net is operated by Ed
        Ropple via TRACE COMPLETE HEAVY INDUSTRIES LLC, a Delaware-registered
        limited liability company (the &quot;Proprietor&quot;).
      </p>
      <h2>2. Data Collection and Storage</h2>
      <p>
        The Proprietor does not collect any data from you in the general course
        of accessing the Site. While ed3d.net does collect site analytics, this
        data is anonymized and cannot be used to identify you. You can block
        this data collection by disabling JavaScript in your browser, though
        we&apos;d appreciate it if you didn&apos;t. If you as a user choose to
        share data with us in the form of user comments or otherwise interacting
        with the Site&apos;s content, we will of course collect that data.
      </p>
      <p>
        Your data may be transferred out of and stored outside of the state,
        province, or country in which you are located. The Proprietor is based
        in the United States of America and the Site is hosted in the United
        States of America; any data provided will be transferred to and stored
        in the United States of America. The data protection laws of the United
        States of America may differ from those in your country of residence.
      </p>
      <h2>3. Third-Party Providers</h2>
      <p>
        No third-party providers are used in the general course of accessing the
        Site, unless you explicitly choose to interact with them. For example,
        if you choose to log in to the Site using a third-party provider, you
        are subject to the privacy policies of those providers.
      </p>
      <p>
        All financial transactions are handled by third-party providers. The
        Proprietor does not store any financial information on the Site. In the
        course of engaging in financial transactions with the Proprietor, you
        are subject to the privacy policies of those providers.
      </p>
      <h2>4. Data Retention</h2>
      <p>
        Operational data (user details, user comments, etc. stored in databases)
        are stored indefinitely.
      </p>
      <p>Aggregated site analytics are stored indefinitely.</p>
      <h2>5. Sharing of Your Data</h2>
      <p>
        Unless you choose to share data on the Site in the form of comments or
        otherwise interacting with the Site&apos;s content, we do not share
        identifiable or potentially-identifiable data with any third parties.
      </p>
      <p>
        We may elect in the future to use anonymized usage data for the purposes
        of discussing trends and visitor counts either publicly or with third
        parties, but we do not retain sufficient data to identify your
        individual activity and nor will we share such data if it is possible to
        synthesize it from data sources we do retain.
      </p>
      <h2>6. Changes</h2>
      <p>
        The Proprietor may update this privacy policy from time to time and will
        notify you of any changes by posting the new privacy policy on the Site.
        You are advised to review this privacy policy periodically for any
        changes.
      </p>
      <h2>7. Security</h2>
      <p>
        In the ordinary course of operations, only the Proprietor individually
        has access to any data collected by the Site. The Proprietor will take
        all steps reasonably practical to ensure that your data is treated
        securely and in accordance with this privacy policy.
      </p>
      <h2>8. Children&apos;s Privacy</h2>
      <p>The Site is not intended for use by children under the age of 13.</p>
      <p>
        The Site does not in the ordinary course of usage collect data that
        would be considered identifiable with regards to any user, including
        those under the age of 18. However, a user can choose to provide
        identifiable data in the form of comments or otherwise interacting with
        the Site&apos;s content. If you are a parent or guardian and you are
        aware that your child has provided us with personal information, please{" "}
        <a href="mailto:ed+privacy@ed3d.net">contact us</a>. If we become aware
        that we have collected personal information from children without
        verification of parental consent, we will take steps to remove that
        information from our servers.
      </p>
    </div>
  );
}
