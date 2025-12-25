
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
  
  // White background for transparency handling in JPEGs
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  await page.render({ canvasContext: ctx, viewport }).promise;
  
  const dataUrl = canvas.toDataURL(config.format, config.quality);
  
  // Estimate size (Base64 length * 0.75)
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

    // A4 Dimensions (Points)
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

// --- NEW LAYOUT BASED PDF CREATION ---
export interface PDFPageLayout {
  width: number;
  height: number;
  elements: PDFImageElement[];
}
export interface PDFImageElement {
  file: File;
  x: number; // Percentage 0-1
  y: number; // Percentage 0-1
  width: number; // Percentage 0-1
  height: number; // Percentage 0-1
}

export const createPDFFromLayout = async (pages: PDFPageLayout[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  // Cache embedded images to avoid duplicating bytes in PDF
  const imageCache = new Map<string, any>();

  for (const p of pages) {
    // Default to A4 if width/height not provided, but usually we use standard points
    // A4 = 595.28 x 841.89
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
           // Calculations:
           // UI X/Y is Top-Left %
           // PDF X is Left, Y is Bottom
           const pdfX = el.x * pageWidth;
           const pdfY = pageHeight - (el.y * pageHeight); // Bottom Y
           const pdfW = el.width * pageWidth;
           const pdfH = el.height * pageHeight;

           page.drawImage(image, {
             x: pdfX,
             y: pdfY - pdfH, // Adjust for Top-Left anchor
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

// --- NEW ANNOTATION / OVERLAY EDITING LOGIC ---

export interface EditorElement {
  id: string;
  type: 'text' | 'image';
  pageIndex: number;
  x: number; // Percentage 0-1 relative to page width
  y: number; // Percentage 0-1 relative to page height
  width?: number; // Percentage 0-1
  height?: number; // Percentage 0-1
  rotation?: number; // Degrees
  content: string; // Text string or DataURL
  // Text specific styles
  fontSize?: number; // pt (approx) - We might need to map this carefully
  color?: string; // Hex
  fontFamily?: string;
}

export const savePDFWithAnnotations = async (file: File, elements: EditorElement[]): Promise<Uint8Array> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  // Load Standard Fonts
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

// --- COMPRESSION & SIGNATURE IMPLEMENTATION ---

export type CompressionLevel = 'extreme' | 'recommended' | 'less';

export interface AdaptiveConfig {
  scale: number;
  quality: number;
  projectedDPI: number;
}

export interface SignaturePlacement {
  pageIndex: number;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
}

export const getAdaptiveConfig = (level: CompressionLevel, isTextHeavy: boolean): AdaptiveConfig => {
  const dpiMap = {
    extreme: 72,
    recommended: 144,
    less: 200
  };
  
  const targetDPI = dpiMap[level];
  const scale = Math.min(1.0, targetDPI / 144);
  
  return {
    scale: scale,
    quality: level === 'extreme' ? 0.5 : level === 'recommended' ? 0.75 : 0.9,
    projectedDPI: targetDPI
  };
};

export const getInterpolatedConfig = (sliderValue: number, isTextHeavy: boolean): AdaptiveConfig => {
  const minDPI = 72;
  const maxDPI = 300;
  const dpi = minDPI + (sliderValue / 100) * (maxDPI - minDPI);
  
  return {
    scale: Math.min(1.0, dpi / 144),
    quality: 0.5 + (sliderValue / 200),
    projectedDPI: Math.round(dpi)
  };
};

export const calculateTargetSize = (originalSize: number, level: CompressionLevel, isTextHeavy: boolean): number => {
   const ratio = level === 'extreme' ? 0.3 : level === 'recommended' ? 0.6 : 0.9;
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
  }
  
  const original = cvsOrig.toDataURL('image/jpeg', 0.9);
  const compressed = cvsComp.toDataURL('image/jpeg', config.quality);
  
  const estSize = Math.round(file.size * (compressed.length / original.length));
  
  return {
      original,
      compressed,
      metrics: { estimatedTotalSize: estSize }
  };
};

// --- ADVANCED COMPRESSION UTILITIES ---

interface PageAnalysis {
  pageIndex: number;
  hasImages: boolean;
  imageCount: number;
  textDensity: number;
  complexity: 'simple' | 'medium' | 'complex';
  recommendedStrategy: 'vector' | 'hybrid' | 'raster';
}

const analyzePageContent = async (page: any): Promise<PageAnalysis> => {
  const textContent = await page.getTextContent();
  const ops = await page.getOperatorList();

  let imageCount = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjs.OPS.paintImageXObject ||
        ops.fnArray[i] === pdfjs.OPS.paintInlineImageXObject ||
        ops.fnArray[i] === pdfjs.OPS.paintImageMaskXObject) {
      imageCount++;
    }
  }

  const textDensity = textContent.items.length;
  const hasImages = imageCount > 0;

  let complexity: 'simple' | 'medium' | 'complex' = 'simple';
  if (imageCount > 5 || textDensity > 100) complexity = 'medium';
  if (imageCount > 15 || textDensity > 300) complexity = 'complex';

  let recommendedStrategy: 'vector' | 'hybrid' | 'raster' = 'vector';
  if (imageCount > textDensity * 0.5) recommendedStrategy = 'hybrid';
  if (imageCount > 20 && textDensity < 10) recommendedStrategy = 'raster';

  return {
    pageIndex: page.pageNumber - 1,
    hasImages,
    imageCount,
    textDensity,
    complexity,
    recommendedStrategy
  };
};

const generateImageHash = async (imageData: Uint8ClampedArray, sampleSize: number = 1024): Promise<string> => {
  const sample = [];
  const step = Math.max(1, Math.floor(imageData.length / sampleSize));

  for (let i = 0; i < imageData.length && sample.length < sampleSize; i += step) {
    sample.push(imageData[i]);
  }

  return sample.join('-');
};

const downsampleImage = async (
  canvas: HTMLCanvasElement,
  targetDPI: number,
  currentDPI: number = 150
): Promise<HTMLCanvasElement> => {
  if (targetDPI >= currentDPI) return canvas;

  const scale = targetDPI / currentDPI;
  const newWidth = Math.max(1, Math.floor(canvas.width * scale));
  const newHeight = Math.max(1, Math.floor(canvas.height * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = newWidth;
  offscreen.height = newHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

  return offscreen;
};

const optimizeImageQuality = async (
  canvas: HTMLCanvasElement,
  quality: number,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<{ data: ArrayBuffer; size: number }> => {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const response = await fetch(dataUrl);
  const data = await response.arrayBuffer();

  return { data, size: data.byteLength };
};

const applyMultiPassCompression = async (
  canvas: HTMLCanvasElement,
  targetQuality: number
): Promise<{ data: ArrayBuffer; quality: number; size: number }> => {
  const passes = [targetQuality, targetQuality * 0.9, targetQuality * 0.8, targetQuality * 0.7];
  let bestResult = await optimizeImageQuality(canvas, passes[0], 'jpeg');
  let bestQuality = passes[0];

  for (const q of passes.slice(1)) {
    const result = await optimizeImageQuality(canvas, q, 'jpeg');
    if (result.size < bestResult.size * 0.95) {
      bestResult = result;
      bestQuality = q;
    }
  }

  return { ...bestResult, quality: bestQuality };
};

const processPageWithSmartCompression = async (
  page: any,
  analysis: PageAnalysis,
  config: AdaptiveConfig,
  deduplicationMap: Map<string, { data: ArrayBuffer; embedded?: any }>
): Promise<{ canvas: HTMLCanvasElement; hash: string; strategy: string; stats: any }> => {
  const stats = {
    imagesDetected: analysis.imageCount,
    imagesDuplicated: 0,
    originalDPI: 150,
    targetDPI: config.projectedDPI,
    compressionApplied: 'none'
  };

  let renderScale = config.projectedDPI / 72;

  if (analysis.recommendedStrategy === 'vector' && analysis.textDensity > 50) {
    renderScale = Math.max(2.0, renderScale);
    stats.compressionApplied = 'text-optimized';
  } else if (analysis.hasImages) {
    renderScale = Math.min(2.5, Math.max(1.5, renderScale));
    stats.compressionApplied = 'image-optimized';
  }

  const viewport = page.getViewport({ scale: renderScale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context failed');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  let processedCanvas = canvas;

  if (config.projectedDPI < 150 && analysis.hasImages) {
    processedCanvas = await downsampleImage(canvas, config.projectedDPI, 150);
    stats.compressionApplied = 'downsampled';
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hash = await generateImageHash(imageData.data);

  if (deduplicationMap.has(hash)) {
    stats.imagesDuplicated = 1;
  } else {
    const optimized = await applyMultiPassCompression(processedCanvas, config.quality);
    deduplicationMap.set(hash, { data: optimized.data });
  }

  return {
    canvas: processedCanvas,
    hash,
    strategy: analysis.recommendedStrategy,
    stats
  };
};

const rebuildPDFWithObjectStreams = async (
  processedPages: Array<{
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    hash: string;
  }>,
  quality: number,
  deduplicationMap: Map<string, { data: ArrayBuffer; embedded?: any }>
): Promise<Uint8Array> => {
  const newPdf = await PDFDocument.create();

  for (const pageData of processedPages) {
    let embeddedImage = deduplicationMap.get(pageData.hash)?.embedded;

    if (!embeddedImage) {
      let imageBytes: ArrayBuffer;

      if (deduplicationMap.has(pageData.hash)) {
        imageBytes = deduplicationMap.get(pageData.hash)!.data;
      } else {
        const imageDataUrl = pageData.canvas.toDataURL('image/jpeg', quality);
        imageBytes = await fetch(imageDataUrl).then(r => r.arrayBuffer());
      }

      embeddedImage = await newPdf.embedJpg(imageBytes);

      if (deduplicationMap.has(pageData.hash)) {
        deduplicationMap.get(pageData.hash)!.embedded = embeddedImage;
      }
    }

    const page = newPdf.addPage([pageData.width, pageData.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: pageData.width,
      height: pageData.height
    });
  }

  return newPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50
  });
};

export const compressPDFAdaptive = async (
  file: File,
  level: CompressionLevel,
  onProgress: (p: number) => void,
  overrideSafety: boolean = false,
  customConfig?: AdaptiveConfig
) => {
  const config = customConfig || getAdaptiveConfig(level, false);

  if (!overrideSafety && config.projectedDPI < 72) {
      return {
          data: new Uint8Array(0),
          meta: {
              compressedSize: 0,
              projectedDPI: config.projectedDPI,
              strategyUsed: 'Blocked (Low DPI)'
          },
          status: 'blocked' as const
      };
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument(getSafeBuffer(arrayBuffer)).promise;
  const numPages = pdf.numPages;

  onProgress(5);

  const pageAnalyses: PageAnalysis[] = [];
  const maxAnalysisPages = Math.min(numPages, 5);

  for (let i = 1; i <= maxAnalysisPages; i++) {
    const page = await pdf.getPage(i);
    const analysis = await analyzePageContent(page);
    pageAnalyses.push(analysis);
  }

  onProgress(10);

  const avgTextDensity = pageAnalyses.reduce((sum, a) => sum + a.textDensity, 0) / pageAnalyses.length;
  const avgImageCount = pageAnalyses.reduce((sum, a) => sum + a.imageCount, 0) / pageAnalyses.length;
  const totalImages = pageAnalyses.reduce((sum, a) => sum + a.imageCount, 0);
  const isTextHeavy = avgTextDensity > avgImageCount * 2;

  const deduplicationMap = new Map<string, { data: ArrayBuffer; embedded?: any }>();
  const processedPages: Array<{
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    hash: string;
  }> = [];

  let totalImagesDetected = 0;
  let totalImagesDeduplicated = 0;
  let strategyUsed = 'Smart Hybrid Compression';

  for (let i = 1; i <= numPages; i++) {
    onProgress(10 + (i / numPages) * 70);

    const page = await pdf.getPage(i);
    let analysis: PageAnalysis;

    if (i <= maxAnalysisPages) {
      analysis = pageAnalyses[i - 1];
    } else {
      analysis = {
        pageIndex: i - 1,
        hasImages: avgImageCount > 0,
        imageCount: Math.round(avgImageCount),
        textDensity: Math.round(avgTextDensity),
        complexity: avgTextDensity > 100 ? 'medium' : 'simple',
        recommendedStrategy: isTextHeavy ? 'vector' : 'hybrid'
      };
    }

    const result = await processPageWithSmartCompression(page, analysis, config, deduplicationMap);

    totalImagesDetected += result.stats.imagesDetected;
    totalImagesDeduplicated += result.stats.imagesDuplicated;

    if (analysis.hasImages) {
      strategyUsed = `Image Optimization (${result.stats.compressionApplied})`;
    } else if (isTextHeavy) {
      strategyUsed = 'Text-Heavy Optimization';
    }

    const origVp = page.getViewport({ scale: 1.0 });
    processedPages.push({
      canvas: result.canvas,
      width: origVp.width,
      height: origVp.height,
      hash: result.hash
    });
  }

  onProgress(85);

  const saved = await rebuildPDFWithObjectStreams(
    processedPages,
    config.quality,
    deduplicationMap
  );

  onProgress(95);

  const dedupPercentage = totalImagesDetected > 0
    ? Math.round((totalImagesDeduplicated / totalImagesDetected) * 100)
    : 0;

  const compressionRatio = Math.round((1 - saved.byteLength / file.size) * 100);

  return {
     data: saved,
     meta: {
        compressedSize: saved.byteLength,
        projectedDPI: config.projectedDPI,
        strategyUsed: `${strategyUsed} | ${totalImages} images | ${dedupPercentage}% deduped | ${compressionRatio}% reduction`,
        imagesProcessed: totalImagesDetected,
        imagesDeduplicated: totalImagesDeduplicated
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
