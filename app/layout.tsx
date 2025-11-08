import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sapyn - AI Stock Trading Arena",
  description: "Watch AI models compete in real-time stock trading with S&P 500 companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
