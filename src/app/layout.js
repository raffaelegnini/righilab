import "./globals.css";
import { SITE_TITLE } from "@/utils/constants";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LessonProvider } from "@/components/LessonProvider";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: SITE_TITLE,
  description:
    "Impara giocando sfruttando i tuoi appunti ( e non solo ) accompagnato dalla mascotte del Righi!",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: SITE_TITLE,
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#4fd9c9",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={poppins.className}>
        <LessonProvider>
          <Header />
          {children}
          <Footer />
        </LessonProvider>
      </body>
    </html>
  );
}
