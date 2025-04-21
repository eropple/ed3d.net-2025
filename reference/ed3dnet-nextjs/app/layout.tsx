import clsx from "clsx";
import { Inconsolata, Lora, Noto_Sans_Display } from "next/font/google";

import "./globals.css";
import { Footer } from "../components/Footer";
import { HeaderNav } from "../components/HeaderNav";
import { RELEASE_VERSION } from "../lib/version";

import { defaultViewport } from "./metadata";

const lora = Lora({
  subsets: ["latin-ext"],
  variable: "--font-serif",
});

const noto = Noto_Sans_Display({
  subsets: ["latin-ext"],
  variable: "--font-sans",
});

const inconsolata = Inconsolata({
  subsets: ["latin-ext"],
  variable: "--font-mono",
});

export const generateViewport = defaultViewport;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={clsx([
        lora.variable,
        noto.variable,
        inconsolata.variable,
        "font-serif",
        "bg-light",
      ])}
      data-release-version={RELEASE_VERSION}
    >
      <body className="font-serif">
        <HeaderNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-lg">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
