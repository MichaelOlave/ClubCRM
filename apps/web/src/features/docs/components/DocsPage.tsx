import fs from "fs";
import { Book, FileText, Gavel, Layout, ScrollText } from "lucide-react";
import { DocsPageClient } from "./DocsPageClient";

async function getDocContent(fileName: string) {
  const syncedFileName = fileName === "../README.md" ? "ROOT-README.md" : fileName;

  // Locations to check for docs, ordered by production standalone path and local dev path.
  const possiblePaths = [
    `apps/web/public/docs/${syncedFileName}`, // Standalone prod
    `public/docs/${syncedFileName}`, // Local dev after sync
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8");
      }
    } catch {
      // Continue to next path
    }
  }

  console.error(`Could not find doc ${fileName} in any of:`, possiblePaths);
  return "Failed to load document.";
}

export async function DocsPage() {
  const readme = await getDocContent("../README.md");
  const architecture = await getDocContent("architecture.md");
  const contributing = await getDocContent("contributing.md");
  const decisions = await getDocContent("decisions.md");
  const schema = await getDocContent("schema.md");

  const docs = [
    {
      id: "overview",
      label: "Overview",
      icon: <Book className="size-4" />,
      content: readme,
    },
    {
      id: "architecture",
      label: "Architecture",
      icon: <Layout className="size-4" />,
      content: architecture,
    },
    {
      id: "contributing",
      label: "Contributing",
      icon: <ScrollText className="size-4" />,
      content: contributing,
    },
    {
      id: "decisions",
      label: "Decisions",
      icon: <Gavel className="size-4" />,
      content: decisions,
    },
    {
      id: "schema",
      label: "Schema",
      icon: <FileText className="size-4" />,
      content: schema,
    },
  ];

  return (
    <section className="w-full max-w-6xl space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/50 p-8 shadow-sm sm:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 size-64 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-64 rounded-full bg-brand/5 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Book className="size-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Documentation</h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Explore the core architectural principles, contribution guidelines, and system design of
            ClubCRM.
          </p>
        </div>
      </div>

      <DocsPageClient docs={docs} />
    </section>
  );
}
