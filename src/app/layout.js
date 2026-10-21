import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata = {
  title: "MAX CFO AI — Seu CFO Virtual de Inteligência Artificial",
  description: "MAX CFO AI: o financeiro da sua empresa num só lugar. Fluxo de caixa, DRE, conciliação, simulador tributário e reforma tributária, CNPJ e CFO com inteligência artificial.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MAX CFO"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  }
};

export const viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
