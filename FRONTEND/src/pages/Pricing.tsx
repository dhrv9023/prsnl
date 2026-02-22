import { Navbar } from "@/components/layout/Navbar";
import { Pricing } from "@/components/sections/Pricing";
import { Footer } from "@/components/layout/Footer";

const PricingPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
