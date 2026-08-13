import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSystemSetting } from "@/app/actions";
import { parseRanksList } from "@/lib/validations";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const unitNameSetting = await getSystemSetting("unit_name");
  const unitName = unitNameSetting || "29 Squadron";
  return {
    title: `${unitName} Leave Portal`,
    description: `${unitName} Leave Management System`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [unitNameSetting, ranksSetting, bgImageUrl] = await Promise.all([
    getSystemSetting("unit_name"),
    getSystemSetting("ranks_list"),
    getSystemSetting("background_image_url"),
  ]);

  const unitName = unitNameSetting || "29 Squadron";
  const ranks = parseRanksList(ranksSetting);

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
        style={
          bgImageUrl
            ? {
                backgroundImage: `url("${bgImageUrl}")`,
                backgroundRepeat: "repeat",
                backgroundPosition: "top left",
                backgroundAttachment: "fixed",
              }
            : undefined
        }
      >
        <Navbar unitName={unitName} />
        <main className="flex-1">{children}</main>
        <Footer ranks={ranks} />
      </body>
    </html>
  );
}
