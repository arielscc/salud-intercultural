import config from "@payload-config";
import { GRAPHQL_PLAYGROUND_GET } from "@payloadcms/next/routes";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/modules/auth/admin";

const playground = GRAPHQL_PLAYGROUND_GET(config);

export async function GET(request: Request) {
  const session = await getAdminSession(request.headers);

  if (!session.ok) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return playground(request);
}
