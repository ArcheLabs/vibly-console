import { ProposalDetailPage } from "@/components/coordination/ProposalDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <ProposalDetailPage proposalId={proposalId} />;
}
