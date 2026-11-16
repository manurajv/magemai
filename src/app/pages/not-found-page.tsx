import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <EmptyState
      title="Page not found"
      description="This address is not part of Magemai yet."
      action={
        <Button asChild variant="outline">
          <Link to="/">Back home</Link>
        </Button>
      }
    />
  );
}
