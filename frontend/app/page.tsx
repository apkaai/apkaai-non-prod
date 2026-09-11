import {
  HeroSection,
  StatsBar,
  FeaturedToolsSection,
  NewToolsSection,
  CategoriesSection,
  HowItWorksSection,
  FeaturesSection,
  CompareCTASection,
  TestimonialsSection,
  FinalCTASection,
} from '@/components/landing'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* 1. Hero — headline, CTA, brand pills, social proof */}
      <HeroSection />

      {/* 2. Stats bar — 6 key numbers */}
      <StatsBar />

      {/* 3. Featured tools grid — top 8 hand-picked tools */}
      <FeaturedToolsSection />

      {/* 4. Newest tools — recently added tools */}
      <NewToolsSection />

      {/* 5. Categories — all 15 categories */}
      <CategoriesSection />

      {/* 6. How it works — 3-step process */}
      <HowItWorksSection />

      {/* 7. Features — 8 platform benefits */}
      <FeaturesSection />

      {/* 8. Compare CTA — drives users to comparison tool */}
      <CompareCTASection />

      {/* 9. Testimonials — 6 user reviews */}
      <TestimonialsSection />

      {/* 10. Final CTA — sign up / explore */}
      <FinalCTASection />
    </div>
  )
}
