import { OrganizationPage } from "@/components/organization/OrganizationPage";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  return <OrganizationPage orgId={organizationId} />;
}
