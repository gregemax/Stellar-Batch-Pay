import { SupportHelp } from "@/components/dashboard/docs/SupportHelp"

import FAQSection from "@/components/dashboard/docs/FAQSection";

export default function DashboardDocsPage() {
  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
        <FAQSection />

      <SupportHelp/>
    </div>
  )
}
