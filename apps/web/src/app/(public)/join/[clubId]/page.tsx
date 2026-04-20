import { notFound } from "next/navigation";
import { JoinRequestForm } from "@/features/forms/join-request";
import { getJoinRequestContext } from "@/features/forms/join-request/server";

type Props = {
  params: Promise<{
    clubId: string;
  }>;
};

export default async function JoinRequestPage({ params }: Props) {
  const { clubId: clubIdentifier } = await params;
  const context = await getJoinRequestContext(clubIdentifier);

  if (!context) {
    notFound();
  }

  return <JoinRequestForm context={context} />;
}
