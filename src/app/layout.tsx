
import type {Metadata} from 'next';
import { PT_Sans } from "next/font/google"
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ['400', '700'],
  variable: "--font-pt-sans",
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SatiZap - Cannabis Medicinal',
  description: 'Seu assistente especializado em cannabis medicinal.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          ptSans.variable
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
