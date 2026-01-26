import { Providers } from "@/components/providers/Providers";
import { AdminHeader } from "@/components/admin/AdminHeader";

/**
 * Layout wrapper for admin pages that supplies app providers, renders the admin header, and places the given content into the main area.
 *
 * @param children - Content to render inside the admin layout's main region.
 * @returns The layout's JSX element containing providers, header, and main content.
 */
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-white">
        <AdminHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </Providers>
  );
}

export default AdminLayout;