import "./globals.css";

export const metadata = {
  title: "Polymarket Pro – Advanced Terminal for Prediction Traders",
  description: "Live charts. Alerts. Pro analytics. Built on the Polymarket Relayer."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-[#0a0c10] text-white font-sans">
        {children}
        {/* Sonner (toasts) */}
        <div id="toast-root" />
      </body>
    </html>
  );
}
