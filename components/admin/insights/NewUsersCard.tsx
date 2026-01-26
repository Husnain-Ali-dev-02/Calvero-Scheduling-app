"use client";

import { UsersIcon } from "lucide-react";
import { DocumentCountCard } from "./DocumentCountCard";

/**
 * Renders a DocumentCountCard configured to show the total number of user documents.
 *
 * @returns A JSX element displaying a document count card for users with the title "Total Users" and a user icon.
 */
export function NewUsersCard() {
  return <DocumentCountCard documentType="user" title="Total Users" icon={UsersIcon} />;
}