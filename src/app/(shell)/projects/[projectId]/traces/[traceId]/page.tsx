import { TraceDetailPage } from "./TraceDetailPage";

export default async function Page({ params }: { params: Promise<{ projectId: string; traceId: string }> }) {
  const { projectId, traceId } = await params;
  return <TraceDetailPage projectId={projectId} traceId={traceId} />;
}
