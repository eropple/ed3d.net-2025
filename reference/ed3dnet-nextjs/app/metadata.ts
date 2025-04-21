import { type Metadata, type Viewport } from "next";

import { THEME_COLOR } from "../lib/constants";

export function defaultMetadata(): Partial<Metadata> {
  return {
    metadataBase: new URL("https://ed3d.net"),
  };
}

export function defaultViewport(): Viewport {
  return {
    themeColor: THEME_COLOR,

    width: "device-width",
    initialScale: 1,
    minimumScale: 1,
    maximumScale: 1,
  };
}
