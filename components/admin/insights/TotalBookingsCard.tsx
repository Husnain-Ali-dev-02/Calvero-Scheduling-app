"use client";

import { CalendarCheckIcon } from "lucide-react";
import { DocumentCountCard } from "./DocumentCountCard";

/**
 * Displays a document count card for booking records.
 *
 * @returns A JSX element rendering a DocumentCountCard configured to show the total number of bookings with a calendar check icon.
 */
export function TotalBookingsCard() {
  return <DocumentCountCard documentType="booking" title="Total Bookings" icon={CalendarCheckIcon} />;
}