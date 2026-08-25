import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Room3D — Sketch to 3D render",
  description:
    "Photograph a hand-drawn room sketch and get a navigable 3D render in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs text-foreground/60">
            <div className="flex justify-center gap-4">
              <a href="/privacy" className="hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:underline">
                Terms of Use
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
