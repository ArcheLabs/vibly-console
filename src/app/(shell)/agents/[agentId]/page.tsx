import { AgentDetailPage } from "@/components/agent/AgentDetailPage";

export default async function Page({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return <AgentDetailPage agentId={agentId} />;
}
