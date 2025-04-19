import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemedToaster, ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/ThemeToggle";

const mona = Mona_Sans({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "XcreenShare - Share Your Screen Instantly",
  metadataBase: new URL("https://screen-share-web-rtc.vercel.app/"),
  description:
    "Share your screen📽️😇 instantly with anyone using a simple room code. No downloads or sign-ups required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          mona.className,
          "min-h-screen bg-gradient-to-b from-background to-muted/80 p-2 py-10 flex flex-col justify-between"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
          <ModeToggle />
          <footer className="w-full max-w-7xl px-4 mx-auto">
            <p className="text-sm text-muted-foreground">
              &copy; 2025  Made by{" "}
              <a
                href="http://rexit.live"
                target="_blank"
                className="text-primary"
                rel="noopener noreferrer"
              >
                Rakshit{" "}
              </a>
              ❤️
            </p>
          </footer>
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}