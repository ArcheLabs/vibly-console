import { FeedDetailPage } from "@/components/feed/FeedDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ feedEventId: string }>;
}) {
  const { feedEventId } = await params;
  return <FeedDetailPage eventId={feedEventId} />;
}
