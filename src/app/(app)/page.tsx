import { redirect } from "next/navigation";
import { getPages } from "@/lib/queries";
import { NewPageButton } from "@/components/new-page-button";

export default async function HomePage() {
  const pages = await getPages();

  if (pages.length > 0) {
    redirect(`/p/${pages[0].id}`);
  }

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <h1 className="text-lg font-semibold tracking-tight">
          Start your audit
        </h1>
        <p className="mt-2 text-sm text-muted">
          Create a page for each area you want to review — Homepage, Projects
          page, Checkout — then log the issues you find inside it.
        </p>
        <div className="mt-5 flex justify-center">
          <NewPageButton label="Create your first page" />
        </div>
      </div>
    </div>
  );
}
