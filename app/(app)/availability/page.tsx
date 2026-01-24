import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation";
import { startOfWeek, addWeeks } from "date-fns";


const AvaiabilityPage = async () => {
    const {userId} = await auth();
if (!userId) {
    redirect("/");
  }
  
    // Fetch availability, bookings, and Google busy times in parallel
  const now = new Date();
  const rangeStart = startOfWeek(now);
  const rangeEnd = addWeeks(rangeStart, 8); // 8 weeks ahead
  
  return (
    <div>AvaiabilityPage</div>
  )
}

export default AvaiabilityPage