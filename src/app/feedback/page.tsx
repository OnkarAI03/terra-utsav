import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { SelfieBooth } from "@/components/feedback/SelfieBooth";
import { PageHero } from "@/components/ui/PageHero";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Feedback and Diwali selfie",
  description: "Rate your visit to TERRA UTSAV in a few taps, then take a Diwali selfie with Mini to keep and share.",
  path: "/feedback",
});

export default function FeedbackPage() {
  return (
    <>
      <PageHero
        title={
          <>
            How was <span className="text-sticker-gold">TERRA UTSAV?</span>
          </>
        }
        intro="Rate your visit in a few taps, then take a Diwali selfie with Mini to keep and share."
      />
      <section className="bg-cream-200 py-16 text-ink md:py-20">
        <div className="shell grid items-start gap-10 lg:grid-cols-2">
          <FeedbackForm />
          <div id="selfie" tabIndex={-1} className="anchor-target outline-none">
            <SelfieBooth />
          </div>
        </div>
      </section>
    </>
  );
}
