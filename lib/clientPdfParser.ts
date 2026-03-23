/**
 * Client-side PDF text extraction using pdf.js
 * Runs entirely in the browser - no server cost
 */

export interface PdfParseResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

function getItemTransform(item: unknown): number[] | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }
  const maybeTransform = (item as { transform?: unknown }).transform;
  return Array.isArray(maybeTransform) ? maybeTransform : null;
}

function getItemX(item: unknown): number {
  const transform = getItemTransform(item);
  return transform ? (transform[4] ?? 0) : 0;
}

function getItemY(item: unknown): number {
  const transform = getItemTransform(item);
  return transform ? (transform[5] ?? 0) : 0;
}

function getItemText(item: unknown): string | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }
  const maybeText = (item as { str?: unknown }).str;
  return typeof maybeText === "string" ? maybeText : null;
}

/**
 * Extract text from PDF file using pdf.js (client-side)
 */
export async function parsePdfClientSide(file: File): Promise<PdfParseResult> {
  try {
    // Dynamically import pdf.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source (required for pdf.js)
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    console.log('[clientPdfParser] Starting PDF parsing...');
    console.log('[clientPdfParser] File name:', file.name);
    console.log('[clientPdfParser] File size:', file.size, 'bytes');
    console.log('[clientPdfParser] File type:', file.type);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('[clientPdfParser] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log('[clientPdfParser] PDF loaded successfully');
    console.log('[clientPdfParser] Number of pages:', pdf.numPages);

    let fullText = '';
    const pageCount = pdf.numPages;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`[clientPdfParser] Processing page ${pageNum}/${pageCount}...`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      
      // Extract text items from the page
      if (textContent.items && Array.isArray(textContent.items)) {
        console.log(`[clientPdfParser] Page ${pageNum} has ${textContent.items.length} text items`);
        
        // Sort items by position (top to bottom, left to right)
        const sortedItems = [...textContent.items].sort((a, b) => {
          const yA = getItemY(a); // Y position
          const yB = getItemY(b);
          const xA = getItemX(a); // X position
          const xB = getItemX(b);
          
          // Sort by Y first (top to bottom), then X (left to right)
          if (Math.abs(yA - yB) > 5) {
            return yB - yA; // Higher Y = top of page
          }
          return xA - xB;
        });
        
        let lastY: number | null = null;
        sortedItems.forEach((item, index: number) => {
          const itemText = getItemText(item);
          if (itemText) {
            const currentY = getItemY(item);
            
            // Add newline if we've moved to a new line
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
            }
            
            pageText += itemText;
            
            // Add space between items on same line (unless it's already whitespace)
            if (index < sortedItems.length - 1) {
              const nextItem = sortedItems[index + 1];
              const nextY = getItemY(nextItem);
              if (Math.abs(currentY - nextY) <= 5) {
                // Same line, add space
                pageText += ' ';
              }
            }
            
            lastY = currentY;
            
            // Log first few items for debugging
            if (index < 5) {
              console.log(`[clientPdfParser] Page ${pageNum}, Item ${index}: "${itemText.substring(0, 50)}"`);
            }
          }
        });
      } else {
        console.warn(`[clientPdfParser] Page ${pageNum} has no text items`);
      }
      
      // Add page separator
      if (pageText.trim().length > 0) {
        fullText += pageText.trim() + '\n\n';
        console.log(`[clientPdfParser] Page ${pageNum} extracted ${pageText.trim().length} characters`);
      } else {
        console.warn(`[clientPdfParser] Page ${pageNum} extracted no text!`);
      }
    }

    const finalText = fullText.trim();
    console.log('[clientPdfParser] ===== BEGIN FULL RESUME TEXT DUMP =====');
    console.log(`[clientPdfParser] Total extracted text length: ${finalText.length} characters`);
    console.log(`[clientPdfParser] Number of pages: ${pageCount}`);
    
    // Print entire resume line by line
    const lines = finalText.split(/\r?\n/);
    lines.forEach((line, idx) => {
      console.log(`[clientPdfParser] LINE ${idx + 1}: ${line}`);
    });
    
    console.log('[clientPdfParser] ===== END FULL RESUME TEXT DUMP =====');
    console.log('[clientPdfParser] First 500 characters:', finalText.substring(0, 500));
    console.log('[clientPdfParser] Last 200 characters:', finalText.substring(Math.max(0, finalText.length - 200)));

    if (finalText.length === 0) {
      console.warn('[clientPdfParser] WARNING: No text extracted from PDF!');
      return {
        text: '',
        pageCount,
        success: false,
        error: 'No text could be extracted from PDF. The PDF may be image-based (scanned). Please ensure your PDF contains selectable text.',
      };
    }

    return {
      text: finalText,
      pageCount,
      success: true,
    };
  } catch (error: any) {
    console.error('[clientPdfParser] Error parsing PDF:', error);
    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error?.message || 'Failed to parse PDF',
    };
  }
}

