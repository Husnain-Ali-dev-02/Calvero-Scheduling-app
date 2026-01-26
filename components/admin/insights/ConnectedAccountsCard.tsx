"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import {
  useDocuments,
  useDocumentProjection,
  type DocumentHandle,
} from "@sanity/sdk-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LinkIcon } from "lucide-react";

interface UserProjection {
  connectedAccountsCount: number | null;
}

interface AccountCountReporterProps extends DocumentHandle {
  onCount: (documentId: string, count: number) => void;
}

/**
 * Fetches the count of connected accounts for a document and reports it via `onCount`.
 *
 * @param documentId - ID of the document to query
 * @param documentType - Type of the document to query
 * @param onCount - Callback invoked with `(documentId, count)` when a non-null count is available
 */
function AccountCountReporter({
  documentId,
  documentType,
  onCount,
}: AccountCountReporterProps) {
  const { data } = useDocumentProjection<UserProjection>({
    documentId,
    documentType,
    projection: `{ "connectedAccountsCount": count(connectedAccounts) }`,
  });

  useEffect(() => {
    if (
      data?.connectedAccountsCount !== null &&
      data?.connectedAccountsCount !== undefined
    ) {
      onCount(documentId, data.connectedAccountsCount);
    }
  }, [data?.connectedAccountsCount, documentId, onCount]);

  return null;
}

/**
 * Render a dashboard card that displays the total number of Google Calendars linked across all user documents.
 *
 * The component queries user documents, aggregates per-user connected-account counts reported by nested reporters, and displays the sum inside a styled card.
 *
 * @returns A React element containing the connected accounts card with the aggregated total
 */
export function ConnectedAccountsCard() {
  const { data: users } = useDocuments({
    documentType: "user",
  });

  const [countMap, setCountMap] = useState<Record<string, number>>({});

  const handleCount = useCallback((documentId: string, count: number) => {
    setCountMap((prev) => {
      if (prev[documentId] === count) return prev;
      return { ...prev, [documentId]: count };
    });
  }, []);

  const totalConnected = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-zinc-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-bl-full" />

      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Google Calendars Linked
        </CardTitle>
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200/80 text-amber-700 shadow-sm">
          <LinkIcon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-bold tracking-tight text-zinc-900">
            {totalConnected}
          </p>
          <span className="text-sm text-zinc-500">calendars</span>
        </div>
      </CardContent>
      {users?.map((user) => (
        <Suspense key={user.documentId} fallback={null}>
          <AccountCountReporter {...user} onCount={handleCount} />
        </Suspense>
      ))}
    </Card>
  );
}