import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/AppSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Lab Inventory",
  description: "Enterprise Asset Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen overflow-hidden bg-zinc-50`}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Mobile Header is inside AppSidebar for now, or we can handle it here if better. 
                AppSidebar handles the mobile trigger button.
                We need a container for the page content.
            */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
