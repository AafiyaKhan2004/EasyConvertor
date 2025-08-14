"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import Link from 'next/link';
import { UploadCloud, FileDown, Scissors, Loader2, Home, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast"
import Head from 'next/head';

export default function SpliterPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [pageRanges, setPageRanges] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pdfFile) {
      setPdfName(pdfFile.name.replace(/\.pdf$/i, ''));
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          setTotalPages(pdfDoc.getPageCount());
        } catch (error) {
          console.error("Failed to read PDF:", error);
          toast({
            title: "Invalid PDF File",
            description: "Could not read the provided PDF. It might be corrupted or protected.",
            variant: "destructive",
          });
          setPdfFile(null);
          setTotalPages(0);
        }
      };
      reader.readAsArrayBuffer(pdfFile);
    } else {
        setPdfName('');
        setTotalPages(0);
    }
  }, [pdfFile, toast]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload only a PDF file.",
        variant: "destructive",
      });
      return;
    }
    setPdfFile(file);
  };
  
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if(e.target) e.target.value = '';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const onRemovePdf = () => {
    setPdfFile(null);
    setTotalPages(0);
    setPageRanges('');
  }

  const parsePageRanges = (ranges: string, max: number): number[] => {
    const result = new Set<number>();
    if (!ranges.trim()) return [];

    const parts = ranges.split(',');
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.includes('-')) {
        const [startStr, endStr] = trimmedPart.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= max) {
          for (let i = start; i <= end; i++) {
            result.add(i);
          }
        } else {
            throw new Error(`Invalid range: ${part}. Pages must be between 1 and ${max}.`);
        }
      } else {
        const page = parseInt(trimmedPart, 10);
        if (!isNaN(page) && page >= 1 && page <= max) {
          result.add(page);
        } else {
          throw new Error(`Invalid page number: ${part}. Must be between 1 and ${max}.`);
        }
      }
    }
    return Array.from(result).sort((a, b) => a - b);
  }

  const splitPdf = async () => {
    if (!pdfFile || !pageRanges) {
      toast({
        title: "Missing Information",
        description: "Please upload a PDF and specify the pages to extract.",
        variant: "destructive",
      });
      return;
    }

    setIsSplitting(true);
    try {
      const pageNumbers = parsePageRanges(pageRanges, totalPages);
      if (pageNumbers.length === 0) {
        toast({
          title: "No pages selected",
          description: "Your specified range resulted in no pages being selected. Please check your input.",
          variant: "destructive",
        });
        return;
      }
      
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(pdfDoc, pageNumbers.map(n => n - 1));
      copiedPages.forEach(page => newDoc.addPage(page));

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const finalPdfName = pdfName.trim() ? `${pdfName}-split.pdf` : 'split.pdf';
      link.download = finalPdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    
    } catch (error) {
        console.error("Failed to split PDF:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
            title: "PDF Splitting Failed",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsSplitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>PDF Splitter | Easy Converter</title>
        <meta name="description" content="Split a PDF into multiple files by specifying page ranges. Free, secure, and entirely in your browser." />
      </Head>
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-3xl mx-auto w-full space-y-8">
            <header className="text-center relative">
              <Button variant="outline" size="icon" className="absolute top-0 left-0" asChild>
                <Link href="/" aria-label="Back to Home">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="font-headline text-4xl sm:text-5xl font-bold text-foreground">PDF Splitter</h1>
              <p className="text-muted-foreground mt-2 text-lg">Extract pages from your PDF in two simple steps.</p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud className="text-primary"/>
                  Step 1: Upload PDF
                </CardTitle>
                <CardDescription>Drag & drop your PDF file or click to select it.</CardDescription>
              </CardHeader>
              <CardContent>
                {!pdfFile ? (
                    <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                        "hover:border-primary hover:bg-primary/5",
                        isDraggingOver ? "border-primary bg-primary/10" : "border-border"
                    )}
                    >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={onFileChange}
                        className="hidden"
                    />
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Drop PDF here or click to browse</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="flex-grow">
                            <p className="font-medium truncate">{pdfFile.name}</p>
                            <p className="text-sm text-muted-foreground">{totalPages} pages</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onRemovePdf}>
                            <Home className="h-4 w-4" />
                            <span className="sr-only">Remove PDF</span>
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>

            {pdfFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="text-primary"/>
                    Step 2: Specify Pages and Download
                  </CardTitle>
                  <CardDescription>Enter page numbers or ranges to extract (e.g., 1, 3-5, 8). The new PDF will contain only these pages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Input
                      placeholder="Base name for split file"
                      value={pdfName}
                      onChange={(e) => setPdfName(e.target.value)}
                      className="sm:col-span-2"
                    />
                     <Input
                      placeholder="e.g., 1, 3-5, 8"
                      value={pageRanges}
                      onChange={(e) => setPageRanges(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={splitPdf}
                    disabled={isSplitting || !pageRanges}
                    className="w-full"
                    size="lg"
                  >
                    {isSplitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Splitting...
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2 h-4 w-4" />
                        Split & Download PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
      </main>
    </>
  );
}