import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_NO_FLASH_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Goal Tracker",
  description: "Track goals, entries, and progress across weeks, months, and years.",
  appleWebApp: {
    capable: true,
    title: "Goal Tracker",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#009f94",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
