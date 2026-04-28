import { ProjectSectionPage } from "./ProjectSectionPage";

export default async function Page({ params }: { params: Promise<{ projectId: string; section: string }> }) {
  const { projectId, section } = await params;
  return <ProjectSectionPage projectId={projectId} section={section} />;
}
