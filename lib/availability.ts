/**
 * Availability computation utilities
 *
 * Pure functions for computing available dates and slots.
 * These can be used both in server components (with sanityFetch data)
 * and in server actions.
 */

import {
  startOfDay,
  endOfDay,
  addMinutes,
  addDays,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns";

// ============================================================================
// Types
// ============================================================================

export type AvailabilitySlot = {
  _key: string;
  startDateTime: string;
  endDateTime: string;
};

export type BookingSlot = {
  _id: string;
  startTime: string;
  endTime: string;
};

export type BusyTime = {
  start: Date;
  end: Date;
};

// ============================================================================
// Core Computation Functions
// ============================================================================

/**
 * Determine which dates within the given range contain at least one schedulable slot.
 *
 * @param availability - Host availability slots (each with start/end ISO date-time strings)
 * @param bookings - Confirmed bookings to exclude from availability
 * @param startDate - Range start date (inclusive)
 * @param endDate - Range end date (inclusive)
 * @param slotDurationMinutes - Slot duration in minutes (defaults to 30)
 * @param busyTimes - Optional external busy intervals to exclude from available slots
 * @returns Array of dates formatted as `YYYY-MM-DD` (local timezone) that have at least one available slot
 */
export function computeAvailableDates(
  availability: AvailabilitySlot[],
  bookings: BookingSlot[],
  startDate: Date,
  endDate: Date,
  slotDurationMinutes = 30,
  busyTimes: BusyTime[] = []
): string[] {
  const availableDates: string[] = [];
  let currentDate = startOfDay(startDate);
  const today = startOfDay(new Date());

  while (currentDate <= endDate) {
    // Skip past dates
    if (currentDate < today) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    // Find availability blocks for this day
    const availabilityForDate = availability.filter((slot) => {
      const slotStart = parseISO(slot.startDateTime);
      const slotEnd = parseISO(slot.endDateTime);

      return (
        isWithinInterval(slotStart, { start: dayStart, end: dayEnd }) ||
        isWithinInterval(slotEnd, { start: dayStart, end: dayEnd }) ||
        (slotStart <= dayStart && slotEnd >= dayEnd)
      );
    });

    if (availabilityForDate.length > 0) {
      const hasAvailableSlot = checkDayHasAvailableSlot(
        availabilityForDate,
        bookings,
        dayStart,
        dayEnd,
        slotDurationMinutes,
        busyTimes
      );

      if (hasAvailableSlot) {
        // Format as YYYY-MM-DD in local timezone (not UTC)
        availableDates.push(format(currentDate, "yyyy-MM-dd"));
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return availableDates;
}

/**
 * Produce all non-conflicting time slots of the given duration that fall within host availability for a specific date.
 *
 * @param availability - Host availability windows with ISO start/end date-times; only windows intersecting `date` are considered
 * @param bookings - Confirmed bookings (with ISO start/end times) that block overlapping slots
 * @param date - Target date for which to compute slots (time portion is ignored; day boundaries are applied)
 * @param slotDurationMinutes - Length of each slot in minutes (default: 30)
 * @param busyTimes - External busy periods (Date start/end) that block overlapping slots
 * @returns An array of slot objects with `start` and `end` Date values representing available, non-overlapping booking intervals on the given date
 */
export function computeAvailableSlots(
  availability: AvailabilitySlot[],
  bookings: BookingSlot[],
  date: Date,
  slotDurationMinutes = 30,
  busyTimes: BusyTime[] = []
): Array<{ start: Date; end: Date }> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const now = new Date();
  const slots: Array<{ start: Date; end: Date }> = [];

  // Find availability blocks for this day
  const availabilityForDate = availability.filter((slot) => {
    const slotStart = parseISO(slot.startDateTime);
    const slotEnd = parseISO(slot.endDateTime);

    return (
      isWithinInterval(slotStart, { start: dayStart, end: dayEnd }) ||
      isWithinInterval(slotEnd, { start: dayStart, end: dayEnd }) ||
      (slotStart <= dayStart && slotEnd >= dayEnd)
    );
  });

  for (const availSlot of availabilityForDate) {
    const availStart = parseISO(availSlot.startDateTime);
    const availEnd = parseISO(availSlot.endDateTime);

    // Clamp to day boundaries
    const slotStart = availStart < dayStart ? dayStart : availStart;
    const slotEnd = availEnd > dayEnd ? dayEnd : availEnd;

    // Generate potential slots
    let currentStart = slotStart;
    while (addMinutes(currentStart, slotDurationMinutes) <= slotEnd) {
      const currentEnd = addMinutes(currentStart, slotDurationMinutes);

      // Skip slots in the past
      if (currentStart < now) {
        currentStart = currentEnd;
        continue;
      }

      // Check if this slot is blocked by a booking
      const hasBookingConflict = bookings.some((booking) => {
        const bookingStart = parseISO(booking.startTime);
        const bookingEnd = parseISO(booking.endTime);
        return currentStart < bookingEnd && currentEnd > bookingStart;
      });

      // Check if this slot is blocked by busy time
      const hasBusyConflict = busyTimes.some((busy) => {
        return currentStart < busy.end && currentEnd > busy.start;
      });

      if (!hasBookingConflict && !hasBusyConflict) {
        slots.push({
          start: new Date(currentStart),
          end: new Date(currentEnd),
        });
      }

      currentStart = currentEnd;
    }
  }

  return slots;
}

/**
 * Determine whether there is at least one non-conflicting time slot on a given day.
 *
 * Evaluates availability windows clamped to the provided day bounds and checks sequential candidate slots of the given duration against existing bookings and external busy times.
 *
 * @param availabilityForDate - Availability windows that may overlap the target day (ISO datetime strings in each slot)
 * @param bookings - Existing bookings (ISO datetime strings in each booking)
 * @param dayStart - Start of the target day (inclusive)
 * @param dayEnd - End of the target day (inclusive)
 * @param slotDurationMinutes - Desired slot length in minutes
 * @param busyTimes - External busy periods to treat as conflicting
 * @returns `true` if at least one slot of `slotDurationMinutes` exists within the day that does not overlap any booking or busy time, `false` otherwise.
 */
function checkDayHasAvailableSlot(
  availabilityForDate: AvailabilitySlot[],
  bookings: BookingSlot[],
  dayStart: Date,
  dayEnd: Date,
  slotDurationMinutes: number,
  busyTimes: BusyTime[]
): boolean {
  for (const availSlot of availabilityForDate) {
    const availStart = parseISO(availSlot.startDateTime);
    const availEnd = parseISO(availSlot.endDateTime);

    const slotStart = availStart < dayStart ? dayStart : availStart;
    const slotEnd = availEnd > dayEnd ? dayEnd : availEnd;

    // Generate potential slots
    let currentStart = slotStart;
    while (addMinutes(currentStart, slotDurationMinutes) <= slotEnd) {
      const currentEnd = addMinutes(currentStart, slotDurationMinutes);

      // Check if this slot is blocked by a booking
      const hasBookingConflict = bookings.some((booking) => {
        const bookingStart = parseISO(booking.startTime);
        const bookingEnd = parseISO(booking.endTime);
        return currentStart < bookingEnd && currentEnd > bookingStart;
      });

      // Check if this slot is blocked by busy time
      const hasBusyConflict = busyTimes.some((busy) => {
        return currentStart < busy.end && currentEnd > busy.start;
      });

      if (!hasBookingConflict && !hasBusyConflict) {
        return true;
      }

      currentStart = currentEnd;
    }
  }

  return false;
}