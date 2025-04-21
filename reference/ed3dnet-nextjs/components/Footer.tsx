import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React from "react";

import { SOCIALS } from "../lib/socials";

export const Footer: React.FC = () => {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <hr />
      <div className="sm:grid sm:grid-cols-3 sm:gap-4 py-4 text-sm text-center">
        <div className="italic sm:text-left">
          <p>
            Site the responsibility of{" "}
            <a href="mailto:ed+site@ed3d.net">Ed Ropple</a>. Content under
            permissive license is marked where used. I&apos;ve got a{" "}
            <Link href="/boilerplate/privacy-policy">privacy policy</Link> and a{" "}
            <Link href="/boilerplate/terms-of-service">terms of service</Link>{" "}
            if you&apos;re into that sort of thing.
          </p>
        </div>
        <div />
        <div>
          <ul className="flex space-x-4 justify-center mt-8 md:justify-end sm:mt-0">
            {SOCIALS.map((item, i) => (
              <li key={i}>
                <a
                  target={"_blank"}
                  rel={"noopener noreferrer me"}
                  href={item.href}
                  title={item.name}
                >
                  <FontAwesomeIcon height="2rem" icon={item.icon} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};
