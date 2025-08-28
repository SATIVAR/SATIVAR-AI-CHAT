
import type {Metadata} from 'next';
import { PT_Sans as FontSans } from "next/font/google"
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

const fontSans = FontSans({
  subsets: ["latin"],
  weight: ['400', '700'],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'SatiZap AI Chat',
  description: 'Seu assistente de orçamentos pessoal.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}>
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
