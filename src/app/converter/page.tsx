
"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UploadCloud, FileDown, GripVertical, X, Loader2, Home, Newspaper, AspectRatio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast"
import { Metadata } from 'next';
import Head from 'next/head';


type ImageFile = {
  id: string;
  file: File;
  preview: string;
};

const PAGE_SIZES: { [key: string]: { width: number, height: number } } = {
  a4: { width: 595.28, height: 841.89 },
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612, height: 792 },
};

export default function ConverterPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pdfName, setPdfName] = useState('easy-converter.pdf');
  const [pageSize, setPageSize] = useState('auto');
  const [orientation, setOrientation] = useState('auto');
  const [isConverting, setIsConverting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragImage = useRef<number | null>(null);
  const dragOverImage = useRef<number | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, [images]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));

    if (newImages.length === 0 && files.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload only image files.",
        variant: "destructive",
      });
      return;
    }

    setImages(prev => [...prev, ...newImages]);
  };
  
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if(e.target) {
      e.target.value = '';
    }
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

  const onRemoveImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setImages(images.filter(image => image.id !== id));
  };
  
  const onDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragImage.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragOverImage.current = index;
    const newImages = [...images];
    if (dragImage.current === null || dragOverImage.current === null) return;
    if (dragImage.current === dragOverImage.current) return;

    const draggedItem = newImages.splice(dragImage.current, 1)[0];
    newImages.splice(dragOverImage.current, 0, draggedItem);
    
    dragImage.current = dragOverImage.current;
    setImages(newImages);
  };

  const onDragEnd = () => {
    dragImage.current = null;
    dragOverImage.current = null;
  };
  
  const createPdf = async () => {
    if (images.length === 0) {
      toast({
        title: "No images selected",
        description: "Please upload some images first.",
        variant: "destructive",
      });
      return;
    }
    setIsConverting(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      
      const readImage = (imageFile: ImageFile): Promise<{data: string, width: number, height: number, type: string}> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
              const fileType = imageFile.file.type.split('/')[1]?.toUpperCase() || 'JPEG';
              resolve({ data: img.src, width: img.width, height: img.height, type: fileType });
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile.file);
        });
      };
      
      let doc: any;
      const firstImage = await readImage(images[0]);

      let docOptions: any = {};

      if (pageSize === 'auto') {
        docOptions.orientation = orientation === 'auto' ? (firstImage.width > firstImage.height ? 'l' : 'p') : (orientation === 'landscape' ? 'l' : 'p');
        docOptions.unit = 'px';
        docOptions.format = [firstImage.width, firstImage.height];
      } else {
        docOptions.orientation = orientation === 'auto' ? (PAGE_SIZES[pageSize].width > PAGE_SIZES[pageSize].height ? 'l' : 'p') : (orientation === 'landscape' ? 'l' : 'p');
        docOptions.unit = 'pt';
        docOptions.format = pageSize;
      }
      
      doc = new jsPDF(docOptions);

      const addImageToPage = (imgData: {data: string, width: number, height: number, type: string}) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const ratio = Math.min(pageWidth / imgData.width, pageHeight / imgData.height);
        const imgWidth = imgData.width * ratio;
        const imgHeight = imgData.height * ratio;

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        doc.addImage(imgData.data, imgData.type, x, y, imgWidth, imgHeight);
      }

      addImageToPage(firstImage);

      for (let i = 1; i < images.length; i++) {
        const imgData = await readImage(images[i]);
        doc.addPage();
        addImageToPage(imgData);
      }
      
      const finalPdfName = pdfName.trim() ? (pdfName.endsWith('.pdf') ? pdfName : `${pdfName}.pdf`) : 'easy-converter.pdf';
      doc.save(finalPdfName);

    } catch (error) {
      console.error("Failed to create PDF:", error);
      toast({
        title: "PDF Creation Failed",
        description: "An error occurred. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Converter | Easy Converter</title>
        <meta name="description" content="Convert JPG, PNG, and other images to a single PDF file for free. Upload, reorder, and download your PDF instantly." />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Image to PDF Converter",
              "description": "A free online tool to convert images like JPG and PNG into a single PDF document. Users can upload multiple images, reorder them, and download the final PDF.",
              "applicationCategory": "Utilities",
              "operatingSystem": "Any (Web)",
              "offers": {
                "@type": "Offer",
                "price": "0"
              }
            }),
          }}
          />
      </Head>
      <main className="min-h-screen p-4 sm:p-8">
        <div className="flex justify-center gap-8">
          <div className="max-w-5xl w-full flex-shrink-0 space-y-8">
            <header className="text-center relative">
              <Button variant="outline" size="icon" className="absolute top-0 left-0" asChild>
                <Link href="/" aria-label="Back to Home">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="font-headline text-4xl sm:text-5xl font-bold text-foreground">Easy Converter</h1>
              <p className="text-muted-foreground mt-2 text-lg">Convert your images to PDF in three simple steps.</p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadCloud className="text-primary"/>
                  Step 1: Upload Images
                </CardTitle>
                <CardDescription>Drag & drop your images or click to select files. You can reorder them later.</CardDescription>
              </CardHeader>
              <CardContent>
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
                    multiple
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Drop files here or click to browse</p>
                </div>
              </CardContent>
            </Card>

            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GripVertical className="text-primary"/>
                    Step 2: Reorder Images
                  </CardTitle>
                  <CardDescription>Drag and drop the images to set their order in the final PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragEnter={(e) => onDragEnter(e, index)}
                        onDragEnd={onDragEnd}
                        className="relative group aspect-square border rounded-lg overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-transform will-change-transform"
                      >
                        <Image src={image.preview} alt={`Uploaded image ${index + 1} for PDF conversion.`} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <GripVertical className="text-white w-8 h-8" />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => onRemoveImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove image</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="text-primary"/>
                    Step 3: Configure and Download
                  </CardTitle>
                  <CardDescription>Set the page size, name your file, and click the button to generate and download it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="pdf-name">PDF File Name</Label>
                        <Input
                          id="pdf-name"
                          placeholder="Enter PDF name"
                          value={pdfName}
                          onChange={(e) => setPdfName(e.target.value)}
                        />
                    </div>
                     <div>
                        <Label htmlFor="page-orientation">Page Orientation</Label>
                         <Select value={orientation} onValueChange={setOrientation}>
                            <SelectTrigger id="page-orientation">
                                <SelectValue placeholder="Select orientation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="portrait">Portrait</SelectItem>
                                <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="page-size">Page Size</Label>
                         <Select value={pageSize} onValueChange={setPageSize}>
                            <SelectTrigger id="page-size">
                                <SelectValue placeholder="Select page size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto (image size)</SelectItem>
                                <SelectItem value="a4">A4</SelectItem>
                                <SelectItem value="a3">A3</SelectItem>
                                <SelectItem value="letter">Letter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <Button
                    onClick={createPdf}
                    disabled={isConverting || images.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2 h-4 w-4" />
                        Create & Download PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
