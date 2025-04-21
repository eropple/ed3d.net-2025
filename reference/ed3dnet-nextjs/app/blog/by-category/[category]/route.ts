import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ category: string }> },
) {
  const params = await props.params;
  return redirect(`/blog/by-category/${params.category}/page/1`);
}
