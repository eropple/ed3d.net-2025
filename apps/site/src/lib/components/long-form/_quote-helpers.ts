export type QuoteProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: Array<any>;
  speaker?: string;
  work?: string;
  citeHref?: string;
};

export function QuoteCaption(props: QuoteProps) {
  if (!props.speaker && !props.work) {
    return null;
  }

  let speakerPart = "";
  if (props.speaker) {
    speakerPart = `—${props.speaker}`;
  }

  let workPart = "";
  if (props.work) {
    workPart = `, <cite>${props.work}</cite>`;
  }

  return {
    speakerPart,
    workPart,
    html: `${speakerPart}${workPart}`
  };
}