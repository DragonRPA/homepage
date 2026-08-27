import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Solutions from "@/components/Solutions";
import PublicDataDemo from "@/components/PublicDataDemo";
import TechStack from "@/components/TechStack";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 1. Global Navigation Bar */}
      <Header />

      {/* 2. Hero Section */}
      <Hero />

      {/* 3. Company About & Core Principles */}
      <About />

      {/* 4. Solutions Portfolio */}
      <Solutions />

      {/* 5. Public Data (data.go.kr) Interactive Showcase */}
      <PublicDataDemo />

      {/* 6. Technical Architecture & Security */}
      <TechStack />

      {/* 7. Consultation Inquiry Form */}
      <Contact />

      {/* 8. Footer */}
      <Footer />
    </div>
  );
}