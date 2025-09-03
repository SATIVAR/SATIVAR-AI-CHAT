
import type {Metadata} from 'next';
import { PT_Sans } from "next/font/google"
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster as SonnerToaster } from 'sonner';
import { initializeServices } from '@/lib/startup';

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
  // Initialize services on app start
  if (typeof window === 'undefined') {
    initializeServices();
  }

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
          <SonnerToaster 
            position="top-right"
            richColors
            closeButton
            duration={5000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
