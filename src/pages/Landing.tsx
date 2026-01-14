import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import StatsSection from "@/components/landing/StatsSection";
import LeadForm from "@/components/landing/LeadForm";
import LandingFooter from "@/components/landing/LandingFooter";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const featuresRef = useRef<HTMLElement>(null);
  const leadFormRef = useRef<HTMLElement>(null);

  // Redirect logged-in users to home
  useEffect(() => {
    if (!loading && user) {
      navigate("/inicio");
    }
  }, [user, loading, navigate]);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToLeadForm = () => {
    leadFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  // Show nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if user is logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <HeroSection 
        onScrollToFeatures={scrollToFeatures} 
        onLoginClick={handleLoginClick} 
      />
      <FeaturesSection sectionRef={featuresRef} />
      <BenefitsSection />
      <StatsSection />
      <LeadForm sectionRef={leadFormRef} />
      <LandingFooter onLoginClick={handleLoginClick} />
    </div>
  );
};

export default Landing;
