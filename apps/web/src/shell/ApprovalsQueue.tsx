import { useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApprovalsPage } from "../console";

/** Hosts the existing approvals inbox in a sheet. Review actions stay on ApprovalsPage. */
export function ApprovalsQueue() {
  const [params, setParams] = useSearchParams();
  const open = params.get("queue") === "approvals";

  function close() {
    const next = new URLSearchParams(params);
    next.delete("queue");
    setParams(next, { replace: true });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent side="bottom" className="approvals-queue">
        <div className="approvals-grab" aria-hidden="true" />
        <SheetHeader>
          <SheetTitle>Waiting for co-sign</SheetTitle>
          <SheetDescription>High-risk calls wait here until you approve or reject them.</SheetDescription>
        </SheetHeader>
        <div className="approvals-queue-body">
          <ApprovalsPage />
        </div>
      </SheetContent>
    </Sheet>
  );
}
