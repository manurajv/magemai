import { Button } from "@/components/ui/button";

export function PageControls({
  page,
  hasMore,
  onPrevious,
  onNext,
}: {
  page: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={onPrevious}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">Page {page + 1}</span>
      <Button type="button" variant="outline" size="sm" disabled={!hasMore} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}
