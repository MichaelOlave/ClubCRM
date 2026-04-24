import { Suspense } from "react";
import { Users, UserCheck, UserMinus, Plus } from "lucide-react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { CreateMemberDialog, MemberDirectory } from "@/features/members";
import { createMemberAction, getMemberList } from "@/features/members/server";
import { getActionNotice } from "@/lib/forms";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/shadcn/skeleton";

type Props = {
  searchParams: Promise<{
    memberCreated?: string | string[];
    memberDeleted?: string | string[];
    memberError?: string | string[];
    page?: string;
    q?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function MembersPage({ searchParams }: Props) {
  await requireOrgAdminBackendSession();
  const [allMembers, query] = await Promise.all([getMemberList(), searchParams]);

  const memberNotice = getActionNotice(
    query.memberCreated ?? query.memberDeleted,
    query.memberError
  );
  const memberSuccessNotice = memberNotice?.kind === "success" ? memberNotice : null;
  const memberErrorNotice = memberNotice?.kind === "error" ? memberNotice : null;

  const searchTerm = typeof query.q === "string" ? query.q.toLowerCase() : "";
  const filteredMembers = allMembers.filter((member) => {
    if (!searchTerm) return true;
    return (
      member.firstName.toLowerCase().includes(searchTerm) ||
      member.lastName.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm) ||
      (member.studentId?.toLowerCase().includes(searchTerm) ?? false) ||
      (member.primaryClub?.toLowerCase().includes(searchTerm) ?? false)
    );
  });

  const currentPage = Number(query.page) || 1;
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const stats = {
    total: allMembers.length,
    active: allMembers.filter((m) => m.status === "active").length,
    inactive: allMembers.filter((m) => m.status === "inactive").length,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        description="Create organization-level member records here once, then assign those same members into clubs from the club detail workflow."
        eyebrow="Members"
        title="Organization Members"
      />

      <ActionNotice notice={memberSuccessNotice} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-2 rounded-[1.5rem] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-brand/10 p-2 text-brand">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Members</p>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card className="flex flex-col gap-2 rounded-[1.5rem] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <UserCheck className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Active Members</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
        </Card>
        <Card className="flex flex-col gap-2 rounded-[1.5rem] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-500/10 p-2 text-slate-500">
              <UserMinus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Inactive Members</p>
          </div>
          <p className="text-3xl font-bold text-slate-600">{stats.inactive}</p>
        </Card>
      </div>

      <Card className="space-y-6 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-foreground">Organization members</h2>
            <p className="text-sm text-muted-foreground">
              {totalItems} members found in the directory
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Suspense fallback={<Skeleton className="h-11 w-full max-w-sm rounded-[1.25rem]" />}>
              <SearchInput
                className="max-w-sm"
                placeholder="Search members by name, email, or ID..."
              />
            </Suspense>
            <CreateMemberDialog action={createMemberAction} notice={memberErrorNotice}>
              <Button className="rounded-[1.25rem] shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Member
              </Button>
            </CreateMemberDialog>
          </div>
        </div>

        <MemberDirectory
          currentPage={currentPage}
          members={paginatedMembers}
          pageSize={PAGE_SIZE}
          searchParams={query}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </Card>
    </div>
  );
}
