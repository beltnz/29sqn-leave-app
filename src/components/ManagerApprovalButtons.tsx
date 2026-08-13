"use client";

import { useTransition } from "react";
import { updateLeaveRequestStatus } from "@/app/actions";
import { Check, X, Loader2 } from "lucide-react";

export default function ManagerApprovalButtons({ requestId }: { requestId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (status: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      await updateLeaveRequestStatus(requestId, status);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleAction("APPROVED")}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Approve
      </button>
      <button
        onClick={() => handleAction("REJECTED")}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        Reject
      </button>
    </div>
  );
}
