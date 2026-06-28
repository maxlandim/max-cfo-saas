import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MAX CFO AI — Seu CFO Virtual de Inteligência Artificial",
  description: "MAX CFO AI: Seu CFO virtual. Análise financeira, DRE, simulações, empresas por CNPJ. 100% local, sem APIs.",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
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

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
