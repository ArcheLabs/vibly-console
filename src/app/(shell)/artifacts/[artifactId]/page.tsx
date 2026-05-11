import { ArtifactDetailPage } from "@/components/coordination/ArtifactDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId } = await params;
  return <ArtifactDetailPage artifactId={artifactId} />;
}
