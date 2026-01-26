"use client";

import type { ToolbarProps, View } from "react-big-calendar";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyDayPopover } from "./copy-day-popover";
import type { TimeBlock } from "../types";

interface CustomToolbarProps {
  onCopyDayToWeek?: (dayIndex: number, includeWeekends: boolean) => void;
  onClearWeek?: () => void;
  showCopyButton?: boolean;
}

type CalendarToolbarProps = ToolbarProps<TimeBlock, object> &
  CustomToolbarProps;

/**
 * Renders a calendar toolbar with view switching, current date label, optional copy/clear actions, and navigation controls.
 *
 * If the Clear Week action is used, the user is prompted for confirmation before `onClearWeek` is invoked.
 *
 * @param label - Text label for the currently displayed date range
 * @param onNavigate - Callback invoked with "TODAY", "PREV", or "NEXT" to change the visible date range
 * @param onView - Callback invoked with the selected view name when a view button is clicked
 * @param view - The currently active view name
 * @param views - Available view names used to render view-switcher buttons
 * @param onCopyDayToWeek - Optional callback used by the Copy Day popover to copy a day into the week; called with the day index and a boolean to include weekends
 * @param onClearWeek - Optional callback invoked to clear all events for the week (requires user confirmation)
 * @param showCopyButton - When true, shows the copy/clear controls on the toolbar
 * @returns A JSX element containing the toolbar UI
 */
export function CalendarToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
  onCopyDayToWeek,
  onClearWeek,
  showCopyButton = false,
}: CalendarToolbarProps) {
  const viewOptions = Array.isArray(views) ? views : [];

  const handleClearWeek = () => {
    if (
      window.confirm("Are you sure you want to clear all events this week?")
    ) {
      onClearWeek?.();
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      {/* Left: View switcher */}
      <div className="flex gap-1">
        {viewOptions.map((v) => (
          <Button
            key={v}
            variant={view === v ? "default" : "outline"}
            size="sm"
            onClick={() => onView(v as View)}
            className="max-sm:h-8 max-sm:w-8 max-sm:p-0"
          >
            <span className="hidden sm:inline">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </span>
            <span className="sm:hidden">{v.charAt(0).toUpperCase()}</span>
          </Button>
        ))}
      </div>

      {/* Center: Current date label */}
      <span className="text-lg font-semibold max-sm:text-sm">{label}</span>

      {/* Right: Actions + Navigation */}
      <div className="flex items-center gap-2">
        {showCopyButton && (
          <div className="flex items-center gap-1">
            {onCopyDayToWeek && <CopyDayPopover onCopy={onCopyDayToWeek} />}

            {onClearWeek && (
              <Button
                variant="destructive"
                size="sm"
                className="max-sm:h-8 max-sm:w-8 max-sm:p-0"
                onClick={handleClearWeek}
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear Week</span>
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}