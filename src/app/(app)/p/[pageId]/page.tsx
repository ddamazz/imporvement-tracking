import { notFound } from "next/navigation";
import { getIssues, getPage } from "@/lib/queries";
import { PageView } from "@/components/page-view";

export default async function AuditPage(props: PageProps<"/p/[pageId]">) {
  const { pageId } = await props.params;

  const page = await getPage(pageId);
  if (!page) notFound();

  const issues = await getIssues(pageId);

  return <PageView page={page} issues={issues} />;
}
