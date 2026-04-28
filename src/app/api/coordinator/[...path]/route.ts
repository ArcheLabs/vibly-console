import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config/env";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const url = new URL(request.url);
  const coordinatorUrl = url.searchParams.get("__coordinatorUrl") ?? process.env.COORDINATOR_URL ?? appConfig.defaultCoordinatorUrl;
  const apiToken = url.searchParams.get("__apiToken") ?? "";
  url.searchParams.delete("__coordinatorUrl");
  url.searchParams.delete("__apiToken");

  const target = new URL(`/${params.path.join("/")}`, coordinatorUrl);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers: HeadersInit = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
  });

  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

void METHODS;
