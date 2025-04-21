import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("GWARRRRR");
  return redirect("/blog/page/1");
}
