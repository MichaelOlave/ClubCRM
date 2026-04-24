import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shadcn/button";

type Props = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  pageSize: number;
  totalItems: number;
  searchParams?: Record<string, string | string[] | undefined>;
};

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  pageSize,
  totalItems,
  searchParams,
}: Props) {
  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();

    // Preserve existing search params except for 'page'
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (key !== "page" && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
          } else {
            params.set(key, value);
          }
        }
      }
    }

    params.set("page", page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
        <span className="font-medium text-foreground">
          {Math.min(currentPage * pageSize, totalItems)}
        </span>{" "}
        of <span className="font-medium text-foreground">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild
          disabled={currentPage === 1}
          size="sm"
          variant="outline"
          className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
        >
          <Link href={getPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Page</span>
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              asChild
              className={cn(page === currentPage && "pointer-events-none")}
              key={page}
              size="sm"
              variant={page === currentPage ? "secondary" : "ghost"}
            >
              <Link href={getPageUrl(page)}>{page}</Link>
            </Button>
          ))}
        </div>
        <Button
          asChild
          disabled={currentPage === totalPages}
          size="sm"
          variant="outline"
          className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
        >
          <Link href={getPageUrl(currentPage + 1)}>
            <span className="sr-only">Next Page</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
