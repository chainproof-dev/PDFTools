import { PDFDocument, rgb, degrees, StandardFonts, PDFFont } from 'pdf-lib';
import JSZip from 'jszip';
import { PDFMetadata } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for ESM import of pdfjs-dist
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Configure Worker
if (typeof window !== 'undefined') {
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

// Helper to read file as ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const getSafeBuffer = (buffer: ArrayBuffer): Uint8Array => {
  return new Uint8Array(buffer).slice(0);
};

// --- Advanced Image Processing Algorithms ---

/**
 * Applies Grayscale conversion to canvas context.
 * Uses Rec. 709 luma coefficients for perceptual accuracy.
 */
const applyGrayscale = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luma calculation: 0.2126 R + 0.7152 G + 0.0722 B
    const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Applies Adaptive Thresholding (Binarization) for 1-bit color depth simulation.
 * Excellent for text-heavy documents (invoices, forms) to maximize compression
 * while retaining sharpness.
 * Uses a simple global threshold optimized for scanned text.
 */
const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number, threshold: number = 140) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Assume grayscale is already applied or work on luminance
    const v = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const val = v >= threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Determines the optimal compression strategy based on document type and desired level.
 */
type CompressionStrategy = 'color' | 'grayscale' | 'monochrome';

const determineStrategy = (level: CompressionLevel, isTextHeavy: boolean): CompressionStrategy => {
  if (level === 'extreme') {
    return isTextHeavy ? 'monochrome' : 'grayscale';
  }
  if (level === 'recommended') {
    return isTextHeavy ? 'grayscale' : 'color';
  }
  return 'color';
};

// --- Core PDF Utilities ---

export const loadPDFDocument = async (file: File) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  return pdfjs.getDocument(getSafeBuffer(arrayBuffer)).promise;
};

// --- Analysis & Utilities ---

export const analyzePDF = async (file: File): Promise<{ isTextHeavy: boolean; pageCount: number }> => {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const loadingTask = pdfjs.getDocument(getSafeBuffer(arrayBuffer));
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const maxPagesToCheck = Math.min(numPages, 3);
    let totalTextItems = 0;

    for (let i = 1; i <= maxPagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      totalTextItems += textContent.items.length;
    }

    const avgTextItems = totalTextItems / maxPagesToCheck;
    return {
      isTextHeavy: avgTextItems > 20,
      pageCount: numPages
    };
  } catch (e) {
    console.error("Analysis failed", e);
    return { isTextHeavy: false, pageCount: 0 };
  }
};

export const getPdfPagePreviews = async (file: File): Promise<string[]> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjs.getDocument(getSafeBuffer(arrayBuffer));
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const previews: string[] = [];
  const maxPages = Math.min(numPages, 50);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    previews.push(canvas.toDataURL('image/jpeg', 0.8));
  }
  return previews;
};

// --- PDF to Image Rendering ---

export interface ImageExportConfig {
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0 to 1
  scale: number; // 1 = 72dpi, 2 = 144dpi, etc.
}

export const renderPageAsImage = async (
  pdfDoc: any, 
  pageIndex: number, 
  config: ImageExportConfig
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> => {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: config.scale });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  await page.render({ canvasContext: ctx, viewport }).promise;
  
  const dataUrl = canvas.toDataURL(config.format, config.quality);
  
  const head = `data:${config.format};base64,`;
  const sizeBytes = Math.round((dataUrl.length - head.length) * 0.75);

  return { dataUrl, width: canvas.width, height: canvas.height, sizeBytes };
};

// --- Core PDF Functions ---

export const mergePDFs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
};

export const createPDFFromImages = async (
  files: File[], 
  layout: { fit: 'contain' | 'cover' | 'fill', margin: number } = { fit: 'contain', margin: 0 }
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    let image;
    
    try {
      if (file.type === 'image/jpeg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        continue;
      }
    } catch (e) {
      console.warn(`Skipping invalid image: ${file.name}`);
      continue;
    }

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    const { width, height } = image.scale(1);
    const availableWidth = pageWidth - (layout.margin * 2);
    const availableHeight = pageHeight - (layout.margin * 2);

    const scale = Math.min(availableWidth / width, availableHeight / height);
    const displayWidth = width * scale;
    const displayHeight = height * scale;

    const x = (pageWidth - displayWidth) / 2;
    const y = (pageHeight - displayHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: displayWidth,
      height: displayHeight
    });
  }
  return pdfDoc.save();
};

export interface PDFPageLayout {
  width: number;
  height: number;
  elements: PDFImageElement[];
}

export interface PDFImageElement {
  file: File;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const createPDFFromLayout = async (pages: PDFPageLayout[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const imageCache = new Map<string, any>();

  for (const p of pages) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    for (const el of p.elements) {
      try {
        let image = imageCache.get(el.file.name);
        if (!image) {
          const arrayBuffer = await readFileAsArrayBuffer(el.file);
          if (el.file.type === 'image/jpeg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
          } else if (el.file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
          }
          if (image) imageCache.set(el.file.name, image);
        }

        if (image) {
           const pdfX = el.x * pageWidth;
           const pdfY = pageHeight - (el.y * pageHeight);
           const pdfW = el.width * pageWidth;
           const pdfH = el.height * pageHeight;

           page.drawImage(image, {
             x: pdfX,
             y: pdfY - pdfH,
             width: pdfW,
             height: pdfH
           });
        }
      } catch (e) {
        console.error("Failed to embed image", e);
      }
    }
  }
  return pdfDoc.save();
};

export const splitPDF = async (file: File): Promise<Blob> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const zip = new JSZip();
  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(page);
    const pdfBytes = await newPdf.save();
    zip.file(`${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
  }
  return zip.generateAsync({ type: 'blob' });
};

export const extractPages = async (file: File, pageIndices: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return newPdf.save();
};

export const rotatePDF = async (file: File, rotation: 90 | 180 | 270): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation();
    page.setRotation(degrees(currentRotation.angle + rotation));
  });
  return pdfDoc.save();
};

export const rotateSpecificPages = async (file: File, rotations: { pageIndex: number, rotation: number }[]): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  rotations.forEach(({ pageIndex, rotation }) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      const page = pages[pageIndex];
      const currentRotation = page.getRotation();
      page.setRotation(degrees(currentRotation.angle + rotation));
    }
  });
  return pdfDoc.save();
};

export const protectPDF = async (file: File, password: string): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  (pdfDoc as any).encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: false,
      documentAssembly: false,
    },
  });
  return pdfDoc.save();
};

export const getPDFMetadata = async (file: File): Promise<PDFMetadata> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    title: pdfDoc.getTitle(),
    author: pdfDoc.getAuthor(),
    subject: pdfDoc.getSubject(),
    keywords: pdfDoc.getKeywords(),
    creator: pdfDoc.getCreator(),
    producer: pdfDoc.getProducer(),
    creationDate: pdfDoc.getCreationDate(),
    modificationDate: pdfDoc.getModificationDate(),
  };
};

export const setPDFMetadata = async (file: File, metadata: PDFMetadata): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords.split(' ')); 
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer);
  if (metadata.creationDate !== undefined) pdfDoc.setCreationDate(metadata.creationDate);
  if (metadata.modificationDate !== undefined) pdfDoc.setModificationDate(metadata.modificationDate);
  return pdfDoc.save();
};

export const getPDFPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (e) {
    console.error("Error counting pages", e);
    return 0;
  }
};

export const flattenPDF = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  form.flatten();
  return pdfDoc.save();
};

export const unlockPDF = async (file: File, password: string): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { password } as any);
  return pdfDoc.save();
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjs.getDocument(getSafeBuffer(arrayBuffer));
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  return fullText;
};

// --- ANNOTATION / OVERLAY EDITING LOGIC ---

export interface EditorElement {
  id: string;
  type: 'text' | 'image';
  pageIndex: number;
  x: number; 
  y: number; 
  width?: number; 
  height?: number; 
  rotation?: number; 
  content: string; 
  fontSize?: number; 
  color?: string; 
  fontFamily?: string;
}

export const savePDFWithAnnotations = async (file: File, elements: EditorElement[]): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  const fonts = {
    Helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    TimesRoman: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    Courier: await pdfDoc.embedFont(StandardFonts.Courier),
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  for (const el of elements) {
    if (el.pageIndex < 0 || el.pageIndex >= pages.length) continue;
    const page = pages[el.pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const pdfX = el.x * pageWidth;
    const pdfY = pageHeight - (el.y * pageHeight);

    if (el.type === 'image') {
       try {
         let image;
         if (el.content.startsWith('data:image/png')) image = await pdfDoc.embedPng(el.content);
         else image = await pdfDoc.embedJpg(el.content);

         const w = (el.width || 0.2) * pageWidth;
         const h = (el.height || 0.2) * pageHeight;
         
         page.drawImage(image, {
           x: pdfX,
           y: pdfY - h, 
           width: w,
           height: h,
           rotate: degrees(el.rotation || 0),
         });
       } catch (e) {
         console.warn("Failed to embed image", e);
       }
    } else if (el.type === 'text') {
       const font = fonts[el.fontFamily as keyof typeof fonts] || fonts.Helvetica;
       const size = el.fontSize || 12;
       
       const lines = el.content.split('\n');
       const lineHeight = size * 1.2;
       
       lines.forEach((line, i) => {
         page.drawText(line, {
           x: pdfX,
           y: pdfY - (size) - (i * lineHeight), 
           size: size,
           font: font,
           color: el.color ? hexToRgb(el.color) : rgb(0, 0, 0),
           rotate: degrees(el.rotation || 0),
         });
       });
    }
  }

  return pdfDoc.save();
};

// --- ADVANCED COMPRESSION ENGINE ---

export type CompressionLevel = 'extreme' | 'recommended' | 'less';

export interface AdaptiveConfig {
  scale: number;
  quality: number;
  projectedDPI: number;
  strategy: CompressionStrategy;
}

export interface SignaturePlacement {
  pageIndex: number;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
}

/**
 * Advanced Adaptive Configuration
 * Calculates DPI and Compression Strategy based on Document Type and Level
 */
export const getAdaptiveConfig = (level: CompressionLevel, isTextHeavy: boolean): AdaptiveConfig => {
  const strategy = determineStrategy(level, isTextHeavy);

  // Base DPI Configuration
  let targetDPI = 150;
  let quality = 0.75;

  if (level === 'extreme') {
    if (strategy === 'monochrome') {
      // For text (monochrome), we can afford higher DPI because 1-bit is incredibly small
      targetDPI = 200; 
      quality = 1; // Quality irrelevant for PNG
    } else {
      // For images (grayscale), we need to be aggressive
      targetDPI = 72; 
      quality = 0.4;
    }
  } else if (level === 'recommended') {
    if (strategy === 'grayscale') {
      targetDPI = 120;
      quality = 0.6;
    } else {
      // Color
      targetDPI = 144;
      quality = 0.7;
    }
  } else { // less
    targetDPI = 200;
    quality = 0.85;
  }
  
  return {
    scale: targetDPI / 72, // PDFLib/PDFJS uses scale where 1.0 = 72dpi usually, but we treat scale explicitly here
    quality: quality,
    projectedDPI: targetDPI,
    strategy: strategy
  };
};

export const getInterpolatedConfig = (sliderValue: number, isTextHeavy: boolean): AdaptiveConfig => {
  const minDPI = 72;
  const maxDPI = 300;
  const dpi = minDPI + (sliderValue / 100) * (maxDPI - minDPI);
  
  // Simple strategy shift based on slider
  let strategy: CompressionStrategy = 'color';
  if (sliderValue < 40) strategy = isTextHeavy ? 'monochrome' : 'grayscale';
  else if (sliderValue < 70) strategy = 'grayscale';

  return {
    scale: dpi / 72,
    quality: 0.4 + (sliderValue / 100) * 0.55,
    projectedDPI: Math.round(dpi),
    strategy
  };
};

export const calculateTargetSize = (originalSize: number, level: CompressionLevel, isTextHeavy: boolean): number => {
   // Heuristic estimation
   let ratio = 0.6;
   if (level === 'extreme') ratio = isTextHeavy ? 0.15 : 0.3; // Mono is tiny
   if (level === 'less') ratio = 0.9;
   return Math.round(originalSize * ratio);
};

export const generatePreviewPair = async (file: File, config: AdaptiveConfig) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument(getSafeBuffer(arrayBuffer)).promise;
  const page = await pdf.getPage(1);
  
  const vpOrig = page.getViewport({ scale: 1.5 });
  const cvsOrig = document.createElement('canvas');
  cvsOrig.width = vpOrig.width;
  cvsOrig.height = vpOrig.height;
  const ctxOrig = cvsOrig.getContext('2d');
  if (ctxOrig) {
     ctxOrig.fillStyle = 'white';
     ctxOrig.fillRect(0,0, cvsOrig.width, cvsOrig.height);
     await page.render({ canvasContext: ctxOrig, viewport: vpOrig }).promise;
  }
  
  const vpComp = page.getViewport({ scale: config.scale });
  const cvsComp = document.createElement('canvas');
  cvsComp.width = vpComp.width;
  cvsComp.height = vpComp.height;
  const ctxComp = cvsComp.getContext('2d');
  if (ctxComp) {
      ctxComp.fillStyle = 'white';
      ctxComp.fillRect(0,0, cvsComp.width, cvsComp.height);
      await page.render({ canvasContext: ctxComp, viewport: vpComp }).promise;
      
      // Apply processing for preview to match compression
      if (config.strategy === 'grayscale') applyGrayscale(ctxComp, vpComp.width, vpComp.height);
      if (config.strategy === 'monochrome') applyThreshold(ctxComp, vpComp.width, vpComp.height);
  }
  
  const original = cvsOrig.toDataURL('image/jpeg', 0.9);
  // Use format matching strategy for preview accuracy
  const previewFormat = config.strategy === 'monochrome' ? 'image/png' : 'image/jpeg';
  const compressed = cvsComp.toDataURL(previewFormat, config.quality);
  
  const estSize = Math.round(file.size * (compressed.length / original.length));
  
  return {
      original,
      compressed,
      metrics: { estimatedTotalSize: estSize }
  };
};

export const compressPDFAdaptive = async (
  file: File, 
  level: CompressionLevel, 
  onProgress: (p: number) => void,
  overrideSafety: boolean = false,
  customConfig?: AdaptiveConfig,
  analysisData?: { isTextHeavy: boolean }
) => {
  // Determine content type if not provided
  const isTextHeavy = analysisData?.isTextHeavy !== undefined 
    ? analysisData.isTextHeavy 
    : (await analyzePDF(file)).isTextHeavy;

  const config = customConfig || getAdaptiveConfig(level, isTextHeavy);
  
  if (!overrideSafety && config.projectedDPI < 72) {
      return {
          data: new Uint8Array(0),
          meta: {
              compressedSize: 0,
              projectedDPI: config.projectedDPI,
              strategyUsed: config.strategy,
              message: 'Blocked (Low DPI)'
          },
          status: 'blocked' as const
      };
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument(getSafeBuffer(arrayBuffer)).promise;
  const numPages = pdf.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    onProgress((i / numPages) * 90);
    
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: config.scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    // Render Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render Page Content
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    
    // --- Advanced Pixel Processing Engine ---
    if (config.strategy === 'grayscale') {
      applyGrayscale(ctx, vp.width, vp.height);
    } else if (config.strategy === 'monochrome') {
      // Thresholding usually handles noise better if slightly blurred, 
      // but we apply direct threshold here for speed.
      applyThreshold(ctx, vp.width, vp.height);
    }

    // Select format based on strategy
    // Note: 'monochrome' works best with PNG to avoid JPEG artifacts around text edges
    const outputFormat = config.strategy === 'monochrome' ? 'image/png' : 'image/jpeg';
    const imgData = canvas.toDataURL(outputFormat, config.quality);
    
    const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
    
    // Embed image
    let embed;
    if (outputFormat === 'image/png') {
      embed = await newPdf.embedPng(imgBytes);
    } else {
      embed = await newPdf.embedJpg(imgBytes);
    }
    
    // Preserve original page dimensions
    const origVp = page.getViewport({ scale: 1.0 });
    const p = newPdf.addPage([origVp.width, origVp.height]);
    
    p.drawImage(embed, {
        x: 0, 
        y: 0,
        width: origVp.width,
        height: origVp.height
    });
  }

  // Enable object streams for better compression of the PDF structure itself
  const saved = await newPdf.save({ useObjectStreams: true });
  
  return {
     data: saved,
     meta: {
        compressedSize: saved.byteLength,
        projectedDPI: config.projectedDPI,
        strategyUsed: config.strategy
     },
     status: 'success' as const
  };
};

export const applySignaturesToPDF = async (file: File, signatures: SignaturePlacement[]) => {
   const arrayBuffer = await readFileAsArrayBuffer(file);
   const pdfDoc = await PDFDocument.load(arrayBuffer);
   
   for (const sig of signatures) {
      if (sig.pageIndex < 0 || sig.pageIndex >= pdfDoc.getPageCount()) continue;
      
      let image;
      if (sig.dataUrl.startsWith('data:image/png')) {
          image = await pdfDoc.embedPng(sig.dataUrl);
      } else {
          image = await pdfDoc.embedJpg(sig.dataUrl);
      }
      
      const page = pdfDoc.getPage(sig.pageIndex);
      const { width, height } = page.getSize();
      
      const targetW = width * sig.width;
      const targetH = targetW / sig.aspectRatio;
      
      page.drawImage(image, {
          x: width * sig.x,
          y: height - (height * sig.y) - targetH,
          width: targetW,
          height: targetH
      });
   }
   
   return pdfDoc.save();
};
