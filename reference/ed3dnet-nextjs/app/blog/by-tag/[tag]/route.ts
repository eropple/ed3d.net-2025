import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ tag: string }> },
) {
  const params = await props.params;
  return redirect(`/blog/by-tag/${params.tag}/page/1`);
}
