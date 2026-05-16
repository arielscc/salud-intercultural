import { PublicLayout } from "@/components/public/PublicLayout";

export default function PublicRouteLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
