import { useRef, useState } from 'react';
import { downloadElementAsPdf } from '@/lib/printExport';

/**
 * Captures a referenced DOM element and downloads it directly as a PDF.
 * No print dialog is shown — the file goes straight to the browser's downloads.
 */
export function useScreenshotExport(title: string) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  // captureImage kept for API compatibility but no longer used for printing
  const [captureImage] = useState<string | null>(null);

  const exportPdf = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      await downloadElementAsPdf(contentRef.current, title);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return { contentRef, exporting, exportPdf, captureImage };
}
