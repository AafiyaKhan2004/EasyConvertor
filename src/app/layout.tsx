
import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: {
    default: 'Easy Converter | Free Image to PDF Converter',
    template: '%s | Easy Converter',
  },
  description: 'The easiest way to convert images to PDF. Drag, drop, reorder, and convert JPG, PNG, and other image formats to PDF for free. No registration required.',
  keywords: ['Image to PDF', 'PDF Converter', 'JPG to PDF', 'PNG to PDF', 'Convert to PDF', 'Free PDF Converter'],
  authors: [{ name: 'Easy Converter' }],
  creator: 'Easy Converter',
  publisher: 'Easy Converter',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Easy Converter",
              "url": "https://easy-converter-1.web.app/", 
            }),
          }}
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
