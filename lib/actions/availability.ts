"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth } from "date-fns";
import { defineQuery } from "next-sanity";
import { writeClient } from "@/sanity/lib/writeClient";
import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import {
  USER_ID_BY_CLERK_ID_QUERY,
  USER_SLUG_QUERY,
} from "@/sanity/queries/users";
import {
  MEETING_TYPES_BY_HOST_QUERY,
  HOST_ID_BY_CLERK_ID_QUERY,
  type MeetingTypeForHost,
} from "@/sanity/queries/meetingTypes";
import { generateSlug, getBaseUrl } from "@/lib/url";
import { PLAN_LIMITS, getUserPlan } from "@/lib/features";
import type { TimeBlock } from "@/components/calendar/types";
import type { BookingQuotaStatus } from "@/lib/features";

/**
 * Retrieve a user document by Clerk ID or create a new user record from the current Clerk profile when none exists.
 *
 * @param clerkId - Clerk identifier used to find or assign the user document
 * @returns An object containing the Sanity document `_id` of the found or newly created user
 * @throws Error if the current Clerk profile cannot be retrieved
 */
export async function getOrCreateUser(clerkId: string) {
  // First try to find existing user
  const existingUser = await client.fetch(USER_ID_BY_CLERK_ID_QUERY, {
    clerkId,
  });

  if (existingUser) {
    return existingUser;
  }

  // Get user details from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("User not found in Clerk");
  }

  // Create new user document
  const newUser = await writeClient.create({
    _type: "user",
    clerkId,
    name:
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username || "User",
    email: clerkUser.emailAddresses[0]?.emailAddress,
    availability: [],
  });

  return { _id: newUser._id };
}

/**
 * Replace the authenticated user's entire availability with the provided time blocks.
 *
 * @returns An array of saved availability blocks, each containing the assigned `id` and ISO `start` and `end` datetimes.
 * @throws Error when the caller is not authenticated.
 */
export async function saveAvailability(
  blocks: TimeBlock[]
): Promise<Array<{ id: string; start: string; end: string }>> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getOrCreateUser(userId);

  // Convert blocks to Sanity format with new keys
  const sanityBlocks = blocks.map((block) => ({
    _key: crypto.randomUUID(),
    startDateTime: block.start.toISOString(),
    endDateTime: block.end.toISOString(),
  }));

  // Replace the entire availability array
  await writeClient
    .patch(user._id)
    .set({ availability: sanityBlocks })
    .commit();

  // Return the blocks with their new IDs
  return sanityBlocks.map((block) => ({
    id: block._key,
    start: block.startDateTime,
    end: block.endDateTime,
  }));
}

/**
 * Ensures the authenticated user has a booking slug and returns the booking slug and full booking URL.
 *
 * @returns The user's booking `slug` and the corresponding booking `url`.
 * @throws Error when the request is not authenticated.
 */
export async function getOrCreateBookingLink(): Promise<{
  slug: string;
  url: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get user with slug
  const user = await client.fetch(USER_SLUG_QUERY, { clerkId: userId });

  if (!user) {
    // Create user first
    const newUser = await getOrCreateUser(userId);
    const clerkUser = await currentUser();
    const name = clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
      : clerkUser?.username || "user";

    const baseSlug = generateSlug(name);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    await writeClient
      .patch(newUser._id)
      .set({ slug: { _type: "slug", current: uniqueSlug } })
      .commit();

    const baseUrl = getBaseUrl();
    return { slug: uniqueSlug, url: `${baseUrl}/book/${uniqueSlug}` };
  }

  // If slug exists, return it
  if (user.slug?.current) {
    const baseUrl = getBaseUrl();
    return {
      slug: user.slug.current,
      url: `${baseUrl}/book/${user.slug.current}`,
    };
  }

  // Create slug for existing user
  const name = user.name || "user";
  const baseSlug = generateSlug(name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  await writeClient
    .patch(user._id)
    .set({ slug: { _type: "slug", current: uniqueSlug } })
    .commit();

  const baseUrl = getBaseUrl();
  return { slug: uniqueSlug, url: `${baseUrl}/book/${uniqueSlug}` };
}

/**
 * Retrieve all meeting types belonging to the currently authenticated user.
 *
 * @returns An array of `MeetingTypeForHost` objects for the authenticated host.
 * @throws Error - if there is no authenticated user ("Unauthorized").
 */
export async function getMeetingTypes(): Promise<MeetingTypeForHost[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data: meetingTypes } = await sanityFetch({
    query: MEETING_TYPES_BY_HOST_QUERY,
    params: { clerkId: userId },
  });

  return meetingTypes;
}

type MeetingDuration = 15 | 30 | 45 | 60 | 90;

/**
 * Create a new meeting type for the authenticated user and return its public representation.
 *
 * Creates the host user document if one does not exist, generates a slug from `data.name`,
 * and persists a meetingType document referencing the host.
 *
 * @param data - Meeting type attributes
 * @param data.name - Human-readable name of the meeting type
 * @param data.duration - Duration in minutes (allowed values: 15, 30, 45, 60, 90)
 * @param data.description - Optional description; returned as `null` when not provided
 * @param data.isDefault - Optional flag; defaults to `true` when omitted
 * @returns The created meeting type containing `_id`, `name`, `slug`, `duration`, `description` (or `null`), and `isDefault`
 * @throws Error - Throws `"Unauthorized"` when there is no authenticated user
 */
export async function createMeetingType(data: {
  name: string;
  duration: MeetingDuration;
  description?: string;
  isDefault?: boolean;
}): Promise<MeetingTypeForHost> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the host's Sanity _id
  const hostId = await client.fetch(HOST_ID_BY_CLERK_ID_QUERY, {
    clerkId: userId,
  });

  if (!hostId) {
    // Create user first
    const user = await getOrCreateUser(userId);
    const slug = generateSlug(data.name);

    const meetingType = await writeClient.create({
      _type: "meetingType",
      name: data.name,
      slug: { _type: "slug", current: slug },
      duration: data.duration,
      description: data.description,
      isDefault: data.isDefault ?? true,
      host: { _type: "reference", _ref: user._id },
    });

    return {
      _id: meetingType._id,
      name: data.name,
      slug,
      duration: data.duration,
      description: data.description ?? null,
      isDefault: data.isDefault ?? true,
    };
  }

  const slug = generateSlug(data.name);

  const meetingType = await writeClient.create({
    _type: "meetingType",
    name: data.name,
    slug: { _type: "slug", current: slug },
    duration: data.duration,
    description: data.description,
    isDefault: data.isDefault ?? true,
    host: { _type: "reference", _ref: hostId },
  });

  return {
    _id: meetingType._id,
    name: data.name,
    slug,
    duration: data.duration,
    description: data.description ?? null,
    isDefault: data.isDefault ?? true,
  };
}

/**
 * Build a booking URL for the authenticated user for a specific meeting type.
 *
 * @param meetingTypeSlug - URL-friendly slug of the meeting type
 * @returns An object with `url` set to the booking page for the current user's slug and the given meeting type
 */
export async function getBookingLinkWithMeetingType(
  meetingTypeSlug: string
): Promise<{
  url: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure user has a slug
  const { slug: userSlug } = await getOrCreateBookingLink();

  const baseUrl = getBaseUrl();
  return { url: `${baseUrl}/book/${userSlug}/${meetingTypeSlug}` };
}

const COUNT_USER_BOOKINGS_QUERY = defineQuery(`count(*[
  _type == "booking"
  && host->clerkId == $clerkId
  && startTime >= $monthStart
  && startTime < $monthEnd
])`);

/**
 * Compute the current user's booking quota status for the current month.
 *
 * If no user is authenticated, returns a quota representing the free plan with `used: 0`, `limit: 0`, `remaining: 0`, and `isExceeded: true`.
 *
 * @returns An object describing booking usage and limits:
 * - `used`: number of bookings the user has in the current month
 * - `limit`: maximum allowed bookings for the month (may be `Infinity`)
 * - `remaining`: bookings left for the month (`Infinity` when `limit` is `Infinity`)
 * - `isExceeded`: `true` if the limit is finite and `used` is greater than or equal to `limit`, `false` otherwise
 * - `plan`: the user's plan identifier
 */
export async function getBookingQuota(): Promise<BookingQuotaStatus> {
  const { userId } = await auth();

  if (!userId) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      isExceeded: true,
      plan: "free",
    };
  }

  const plan = await getUserPlan();
  const limit = PLAN_LIMITS[plan].maxBookingsPerMonth;

  // Count bookings this month
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: used } = await sanityFetch({
    query: COUNT_USER_BOOKINGS_QUERY,
    params: { clerkId: userId, monthStart, monthEnd },
  });

  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  const isExceeded = limit !== Infinity && used >= limit;

  return { used, limit, remaining, isExceeded, plan };
}

const HAS_CONNECTED_ACCOUNT_QUERY = defineQuery(`count(*[
  _type == "user"
  && clerkId == $clerkId
  && defined(connectedAccounts)
  && length(connectedAccounts) > 0
]) > 0`);

/**
 * Determine whether the authenticated user has at least one connected Google account.
 *
 * @returns `true` if the user has at least one connected Google account, `false` otherwise (returns `false` when there is no authenticated user).
 */
export async function hasConnectedAccount(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const { data } = await sanityFetch({
    query: HAS_CONNECTED_ACCOUNT_QUERY,
    params: { clerkId: userId },
  });

  return data;
}