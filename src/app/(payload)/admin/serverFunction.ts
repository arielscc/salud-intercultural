"use server";

import config from "@payload-config";
import { handleServerFunctions } from "@payloadcms/next/layouts";
import type { ServerFunctionClientArgs } from "payload";
import { importMap } from "./importMap";

export async function serverFunction(args: ServerFunctionClientArgs) {
  return handleServerFunctions({
    ...args,
    config,
    importMap
  });
}
