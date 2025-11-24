import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "BTC 15-Min Trading – Polymarket Pro",
  description: "Real-time Bitcoin trading with predictive analytics on Polymarket."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-[#0a0c10] text-white font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
