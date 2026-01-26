"use client";

import { VideoIcon } from "lucide-react";
import { DocumentCountCard } from "./DocumentCountCard";

/**
 * Renders a card showing the total number of meeting types.
 *
 * @returns The `DocumentCountCard` JSX element configured for the "meetingType" document type with title "Meeting Types" and a video icon.
 */
export function TotalMeetingTypesCard() {
  return <DocumentCountCard documentType="meetingType" title="Meeting Types" icon={VideoIcon} />;
}