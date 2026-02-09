import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lorance | AI-Powered Tech Architect",
  description: "Transform project documents into dev-ready tickets. AI generates user stories with acceptance criteria from PRDs, meeting notes, and architecture docs.",
  keywords: ["user stories", "ticket generation", "AI", "PRD", "project planning", "Linear", "Jira", "GitHub Issues"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
