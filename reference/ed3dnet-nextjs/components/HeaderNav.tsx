"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

import { SITE_NAME } from "../lib/constants";

const Brand: React.FC = () => {
  return (
    <Link href="/" className={clsx(["text-2xl"])}>
      {SITE_NAME}
    </Link>
  );
};

export const HeaderNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const TopMenuItem: React.FC<{ href: string; title: string }> = ({
    href,
    title,
  }) => {
    console.log(
      href,
      pathname,
      pathname.toLowerCase().startsWith(href.toLowerCase()),
    );
    const isActive = pathname.toLowerCase().startsWith(href.toLowerCase());

    return (
      <a
        href={href}
        className={clsx([
          "mt-3",
          "px-3",
          "pt-2",
          "pb-2",
          "text-lg",
          "hover:underline",
          "hover:decoration-2",
          "hover:decoration-secondary",
          isActive
            ? [
                "text-white",
                "underline",
                "decoration-2",
                "decoration-secondary",
              ]
            : ["text-gray-300", "hover:text-white"],
        ])}
      >
        {title}
      </a>
    );
  };

  const MobileMenuItem: React.FC<{ href: string; title: string }> = ({
    href,
    title,
  }) => {
    const isActive = pathname.toLowerCase().startsWith(href.toLowerCase());

    return (
      <a
        href={href}
        className={clsx([
          "block",
          "text-base",
          "px-2",
          "py-2",
          "text-lg",
          "hover:underline",
          "hover:decoration-2",
          "hover:decoration-secondary",
          isActive ? ["text-white", ""] : ["text-gray-300", "hover:text-white"],
        ])}
      >
        {title}
      </a>
    );
  };

  const topMenu = [
    // <TopMenuItem key={1} href="/about" title="About" />,
    <TopMenuItem key={2} href="/blog" title="Blog" />,
    // <TopMenuItem key={3} href="/listen" title="Listen" />,
  ];

  const mobileMenu = [
    // <MobileMenuItem key={1} href="/about" title="About" />,
    // <hr key={2} className='border-secondary' />,
    <MobileMenuItem key={3} href="/blog" title="Blog" />,
    // <hr key={4} className='border-secondary' />,
    // <MobileMenuItem key={5} href="/listen" title="Listen" />,
  ];

  return (
    <nav className="bg-primary text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="shrink-0 flex items-center">
            <Brand />
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">{topMenu}</div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="bg-primary inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">{mobileMenu}</div>
        </div>
      )}
    </nav>
  );
};
