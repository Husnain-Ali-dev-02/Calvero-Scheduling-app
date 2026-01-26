import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { sanityFetch } from "@/sanity/lib/live";
import { USER_BY_SLUG_QUERY } from "@/sanity/queries/users";
import {
  MEETING_TYPES_BY_HOST_SLUG_QUERY,
  type MeetingTypePublic,
} from "@/sanity/queries/meetingTypes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import { HostHeader } from "@/components/booking/host-header";

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Render the booking selection page for a host identified by its slug.
 *
 * Fetches host and meeting-type data for the provided route params, then:
 * - triggers a 404 if the host is not found,
 * - redirects to a single or default meeting type when applicable,
 * - renders a message if no meeting types exist,
 * - otherwise renders a selectable list of meeting-type cards.
 *
 * @param params - Promise resolving to route params object containing `slug`
 * @returns The host booking page UI, or performs a redirect/404 depending on fetched data
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;

  const [{ data: host }, { data: meetingTypes }] = await Promise.all([
    sanityFetch({
      query: USER_BY_SLUG_QUERY,
      params: { slug },
    }),
    sanityFetch({
      query: MEETING_TYPES_BY_HOST_SLUG_QUERY,
      params: { hostSlug: slug },
    }),
  ]);

  if (!host) {
    notFound();
  }

  // If there's only one meeting type, redirect directly to it
  if (meetingTypes.length === 1 && meetingTypes[0].slug) {
    redirect(`/book/${slug}/${meetingTypes[0].slug}`);
  }

  // Find default meeting type
  const defaultType = meetingTypes.find((t: MeetingTypePublic) => t.isDefault);
  if (defaultType?.slug && meetingTypes.length > 0) {
    redirect(`/book/${slug}/${defaultType.slug}`);
  }

  // If no meeting types exist, show a message
  if (meetingTypes.length === 0) {
    return (
      <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <HostHeader
            hostName={host.name}
            subtitle="No meeting types available at this time."
          />
        </div>
      </main>
    );
  }

  // Show meeting type selection if multiple types exist
  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <HostHeader
          hostName={`Book a meeting with ${host.name}`}
          subtitle="Select a meeting type to get started"
        />

        {/* Meeting Type Cards */}
        <div className="space-y-4">
          {meetingTypes.map((meetingType: MeetingTypePublic) => (
            <Link
              key={meetingType._id}
              href={`/book/${slug}/${meetingType.slug}`}
              className="block"
            >
              <Card className="transition-all hover:border-blue-500 hover:shadow-md cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {meetingType.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                      {meetingType.duration} min
                    </div>
                  </div>
                </CardHeader>
                {meetingType.description && (
                  <CardContent className="pt-0">
                    <CardDescription>{meetingType.description}</CardDescription>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}