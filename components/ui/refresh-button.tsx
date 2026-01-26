"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  className?: string;
}

/**
 * Render a small outline refresh button that triggers a Next.js router refresh inside a transition.
 *
 * @param className - Optional CSS class name applied to the underlying Button component
 * @returns A JSX element for a refresh button that triggers `router.refresh()` and displays a pending state while the transition is active
 */
export function RefreshButton({ className }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing..." : "Refresh"}
    </Button>
  );
}