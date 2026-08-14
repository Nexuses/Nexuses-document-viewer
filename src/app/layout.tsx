import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexuses Asset",
  description:
    "Nexuses is a growth-focused digital and marketing agency helping businesses scale through strategy, technology, and creative solutions.",
  icons: {
    icon: "/fevicon.png",
  },
  openGraph: {
    title: "Nexuses Asset",
    description:
      "Nexuses is a growth-focused digital and marketing agency helping businesses scale through strategy, technology, and creative solutions.",
    images: [
      {
        url: "https://22527425.fs1.hubspotusercontent-na2.net/hubfs/22527425/metaimage.png",
        width: 1200,
        height: 630,
        alt: "Nexuses Asset",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexuses Asset",
    description:
      "Nexuses is a growth-focused digital and marketing agency helping businesses scale through strategy, technology, and creative solutions.",
    images: ["https://22527425.fs1.hubspotusercontent-na2.net/hubfs/22527425/metaimage.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
