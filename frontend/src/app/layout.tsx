import type { Metadata } from "next";
import { Inter, Silkscreen } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const silkscreen = Silkscreen({ variable: "--font-silkscreen", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "ONB · Email Scheduler",
  description: "Schedule and track outbound emails",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${silkscreen.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-sm">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
