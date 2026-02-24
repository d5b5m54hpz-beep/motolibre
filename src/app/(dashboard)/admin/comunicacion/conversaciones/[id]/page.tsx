import { ConversacionTimeline } from "../../_components/conversacion-timeline";

export default async function ConversacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversacionTimeline conversacionId={id} />;
}
