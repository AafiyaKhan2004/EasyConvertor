import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Easy Converter. All rights reserved.</p>
        <div className="mt-2">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="mx-2">|</span>
            <Link href="/converter" className="hover:underline">Image to PDF</Link>
            <span className="mx-2">|</span>
            <Link href="/spliter" className="hover:underline">PDF Splitter</Link>
        </div>
      </div>
    </footer>
  );
}