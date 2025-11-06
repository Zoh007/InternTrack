/**
 * Resume Text Processor
 * Handles PDF parsing (client-side with pdf.js) and text processing
 */

export interface PdfParseResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

/**
 * Extract text from PDF file using pdf.js (client-side)
 * Runs entirely in the browser - no server cost
 */
export async function parsePdfClientSide(file: File): Promise<PdfParseResult> {
  try {
    // Dynamically import pdf.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source (required for pdf.js)
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    console.log('[resumeProcessor] Starting client-side PDF parsing...');
    console.log('[resumeProcessor] File name:', file.name);
    console.log('[resumeProcessor] File size:', file.size, 'bytes');
    console.log('[resumeProcessor] File type:', file.type);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('[resumeProcessor] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log('[resumeProcessor] PDF loaded successfully');
    console.log('[resumeProcessor] Number of pages:', pdf.numPages);

    let fullText = '';
    const pageCount = pdf.numPages;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`[resumeProcessor] Processing page ${pageNum}/${pageCount}...`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      
      // Extract text items from the page
      if (textContent.items && Array.isArray(textContent.items)) {
        console.log(`[resumeProcessor] Page ${pageNum} has ${textContent.items.length} text items`);
        
        // Sort items by position (top to bottom, left to right)
        const sortedItems = [...textContent.items].sort((a: any, b: any) => {
          const aTransform = (a as any).transform;
          const bTransform = (b as any).transform;
          const yA = aTransform ? aTransform[5] : 0; // Y position
          const yB = bTransform ? bTransform[5] : 0;
          const xA = aTransform ? aTransform[4] : 0; // X position
          const xB = bTransform ? bTransform[4] : 0;
          
          // Sort by Y first (top to bottom), then X (left to right)
          if (Math.abs(yA - yB) > 5) {
            return yB - yA; // Higher Y = top of page
          }
          return xA - xB;
        });
        
        let lastY: number | null = null;
        sortedItems.forEach((item: any, index: number) => {
          if (item.str) {
            const itemTransform = (item as any).transform;
            const currentY = itemTransform ? itemTransform[5] : 0;
            
            // Add newline if we've moved to a new line
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
            }
            
            pageText += item.str;
            
            // Add space between items on same line (unless it's already whitespace)
            if (index < sortedItems.length - 1) {
              const nextItem = sortedItems[index + 1];
              const nextTransform = (nextItem as any).transform;
              const nextY = nextTransform ? nextTransform[5] : 0;
              if (Math.abs(currentY - nextY) <= 5) {
                // Same line, add space
                pageText += ' ';
              }
            }
            
            lastY = currentY;
            
            // Log first few items for debugging
            if (index < 5) {
              console.log(`[resumeProcessor] Page ${pageNum}, Item ${index}: "${item.str.substring(0, 50)}"`);
            }
          }
        });
      } else {
        console.warn(`[resumeProcessor] Page ${pageNum} has no text items`);
      }
      
      // Add page separator
      if (pageText.trim().length > 0) {
        fullText += pageText.trim() + '\n\n';
        console.log(`[resumeProcessor] Page ${pageNum} extracted ${pageText.trim().length} characters`);
      } else {
        console.warn(`[resumeProcessor] Page ${pageNum} extracted no text!`);
      }
    }

    const finalText = fullText.trim();
    console.log('[resumeProcessor] ===== BEGIN FULL RESUME TEXT DUMP =====');
    console.log(`[resumeProcessor] Total extracted text length: ${finalText.length} characters`);
    console.log(`[resumeProcessor] Number of pages: ${pageCount}`);
    
    // Print entire resume line by line
    const lines = finalText.split(/\r?\n/);
    lines.forEach((line, idx) => {
      console.log(`[resumeProcessor] LINE ${idx + 1}: ${line}`);
    });
    
    console.log('[resumeProcessor] ===== END FULL RESUME TEXT DUMP =====');
    console.log('[resumeProcessor] First 500 characters:', finalText.substring(0, 500));
    console.log('[resumeProcessor] Last 200 characters:', finalText.substring(Math.max(0, finalText.length - 200)));

    if (finalText.length === 0) {
      console.warn('[resumeProcessor] WARNING: No text extracted from PDF!');
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
    console.error('[resumeProcessor] Error parsing PDF:', error);
    return {
      text: '',
      pageCount: 0,
      success: false,
      error: error?.message || 'Failed to parse PDF',
    };
  }
}

