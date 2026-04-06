type Props = {
  defaultValue?: string;
  name?: string;
};

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

const defaultRoleOptions = [
  { value: "member", label: "Member" },
  { value: "president", label: "President" },
  { value: "vice_president", label: "Vice President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "coordinator", label: "Coordinator" },
] as const;

function formatRoleLabel(role: string): string {
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(" ");
}

function normalizeRoleValue(role: string): string {
  return role.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getRoleOptions(currentRole?: string) {
  const normalizedRole = currentRole ? normalizeRoleValue(currentRole) : undefined;

  if (
    !normalizedRole ||
    defaultRoleOptions.some((option) => option.value === normalizedRole)
  ) {
    return defaultRoleOptions;
  }

  return [...defaultRoleOptions, { value: normalizedRole, label: formatRoleLabel(normalizedRole) }];
}

export function MembershipRoleSelect({ defaultValue = "member", name = "role" }: Props) {
  const normalizedDefaultValue = normalizeRoleValue(defaultValue);
  const roleOptions = getRoleOptions(normalizedDefaultValue);

  return (
    <select className={selectClassName} defaultValue={normalizedDefaultValue} name={name}>
      {roleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
