import type { ReactNode } from "react";

type Props = {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ actions, description, eyebrow, title }: Props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-8">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">{eyebrow}</p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>

      {actions ? (
        <div className="xl:flex xl:justify-end">
          <div className="w-full xl:max-w-[34rem]">{actions}</div>
        </div>
      ) : null}
    </div>
  );
}
