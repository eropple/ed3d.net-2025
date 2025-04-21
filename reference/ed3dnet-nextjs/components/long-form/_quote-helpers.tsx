import Link from "next/link";

export type FigureBlockQuoteProps = {
  speaker?: string;
  work?: string;
  citeHref?: string;

  // TODO: fix this later
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
};

export function makeCitation({
  speaker,
  work,
  citeHref,
}: FigureBlockQuoteProps) {
  if (!speaker && !work) {
    return null;
  }

  if (speaker && work) {
    return citeHref ? (
      <figcaption>
        &mdash;{speaker},{" "}
        <cite>
          <Link href={citeHref}>{work}</Link>
        </cite>
      </figcaption>
    ) : (
      <figcaption>
        &mdash;{speaker}, <cite>{work}</cite>
      </figcaption>
    );
  }

  if (speaker) {
    return citeHref ? (
      <figcaption>
        &mdash;<Link href={citeHref}>{speaker}</Link>
      </figcaption>
    ) : (
      <figcaption>&mdash;{speaker}</figcaption>
    );
  }

  if (work) {
    return citeHref ? (
      <figcaption>
        &mdash;
        <cite>
          <Link href={citeHref}>{work}</Link>
        </cite>
      </figcaption>
    ) : (
      <figcaption>
        &mdash;<cite>{work}</cite>
      </figcaption>
    );
  }

  return null;
}
