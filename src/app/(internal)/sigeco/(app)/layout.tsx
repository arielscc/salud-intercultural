import { InternalShell } from "@/components/internal/InternalShell";
import { requireInternalUser } from "@/modules/permissions";

export const dynamic = "force-dynamic";

export default async function SigecoAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireInternalUser();
  return <InternalShell user={user}>{children}</InternalShell>;
}
