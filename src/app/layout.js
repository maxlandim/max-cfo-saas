import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

// muda a cada publicação: o navegador baixa o dicionário novo
const VERSAO_I18N = (process.env.NEXT_PUBLIC_BUILD_ID || 'dev').slice(0, 10);

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata = {
  title: "Landim Advisory — Seu CFO Virtual de Inteligência Artificial",
  description: "Landim Advisory: o financeiro da sua empresa num só lugar. Fluxo de caixa, DRE, conciliação, simulador tributário e reforma tributária, CNPJ e CFO com inteligência artificial.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Landim Advisory"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport = {
  themeColor: "#0B1220",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Tradução (português, inglês e espanhol) feita no navegador; enquanto o dicionário carrega, a página fica oculta por no máximo 2,5 s */}
        <style dangerouslySetInnerHTML={{ __html: '.la-traduzindo body{visibility:hidden}' }} />
        <script dangerouslySetInnerHTML={{ __html: `window.__laEsperaReact=true;window.LA_I18N_VERSAO=${JSON.stringify(VERSAO_I18N)};` }} />
        <script src={`/i18n/i18n.js?v=${VERSAO_I18N}`} />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
