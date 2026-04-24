import { TabsView } from "@/components/shadcn/tabs-view";
import type { ProfileViewModel } from "@/features/profile/types";

import { DebugContext } from "./DebugContext";
import { DebugSession } from "./DebugSession";
import { DebugSnapshot } from "./DebugSnapshot";
import { ProfileDetails } from "./ProfileDetails";
import { ProfileHeader } from "./ProfileHeader";

type Props = {
  viewModel: ProfileViewModel;
};

export function ProfileOverview({ viewModel }: Props) {
  const profile = (
    <div className="space-y-6">
      <ProfileHeader summary={viewModel.summary} />
      <ProfileDetails fields={viewModel.personalFields} />
    </div>
  );

  const debug = (
    <div className="space-y-6">
      <DebugSession checks={viewModel.sessionChecks} />
      <DebugContext fields={viewModel.requestFields} />
      <DebugSnapshot snapshot={viewModel.debugSnapshot} />
    </div>
  );

  return (
    <TabsView
      activeId="profile"
      tabs={[
        {
          id: "profile",
          label: "Profile",
          content: profile,
        },
        {
          id: "debug",
          label: "System Debug",
          content: debug,
        },
      ]}
    />
  );
}
