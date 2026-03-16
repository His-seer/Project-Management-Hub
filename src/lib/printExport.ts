/**
 * PDF export utility — no browser print dialog.
 *
 * Uses html-to-image (SVG foreignObject / native browser CSS rendering) so
 * oklch / lab / color-mix colours from Tailwind v4 are rendered correctly.
 *
 * The key challenge: Tailwind v4 defines colour tokens as CSS custom properties
 * on :root.  Inside html-to-image's SVG foreignObject context :root variables
 * are not available, so everything falls back to transparent/zero.
 *
 * Solution: extract every --custom-property from :root CSS rules and set them
 * as inline styles on the captured element so they cascade to all children.
 * The full CSS text is also injected as a <style> child for rule-based styles.
 */

// ─── CSS helpers ─────────────────────────────────────────────────────────────

interface CssSnapshot {
  styleEl: HTMLStyleElement;
  rootVars: Array<[string, string]>;
  cleanup: () => void;
}

function prepareElement(el: HTMLElement): CssSnapshot {
  let cssText = '';
  const rootVars: Array<[string, string]> = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        cssText += rule.cssText + '\n';
        // Collect :root custom properties (Tailwind v4 colour/spacing tokens)
        if (
          rule instanceof CSSStyleRule &&
          (rule.selectorText === ':root' || rule.selectorText === ':host')
        ) {
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith('--')) {
              rootVars.push([prop, rule.style.getPropertyValue(prop).trim()]);
            }
          }
        }
      }
    } catch {
      // Cross-origin sheet — skip
    }
  }

  // Inject CSS text as a child so html-to-image clone includes it
  const styleEl = document.createElement('style');
  styleEl.textContent = cssText;
  el.prepend(styleEl);

  // Apply :root vars directly on the element so they cascade in foreignObject
  for (const [prop, val] of rootVars) {
    el.style.setProperty(prop, val);
  }

  return {
    styleEl,
    rootVars,
    cleanup: () => {
      styleEl.remove();
      for (const [prop] of rootVars) {
        el.style.removeProperty(prop);
      }
    },
  };
}

// ─── Canvas → PDF ────────────────────────────────────────────────────────────

async function canvasToPdf(canvas: HTMLCanvasElement, filename: string) {
  const { default: jsPDF } = await import('jspdf');
  const imgData = canvas.toDataURL('image/png');
  const A4_W = 210;
  const A4_H = 297;
  const imgWidthMm = A4_W;
  const imgHeightMm = (canvas.height / canvas.width) * A4_W;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (imgHeightMm <= A4_H) {
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm);
  } else {
    let yOffset = 0;
    let page = 0;
    while (yOffset < imgHeightMm) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidthMm, imgHeightMm);
      yOffset += A4_H;
      page++;
    }
  }
  pdf.save(`${filename}.pdf`);
}

// ─── html-to-image → canvas ──────────────────────────────────────────────────

async function elementToCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('html-to-image');
  const snapshot = prepareElement(el);
  try {
    return await toCanvas(el, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    } as Record<string, unknown>);
  } finally {
    snapshot.cleanup();
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Captures a hidden .print-document element by ID and downloads as PDF.
 * Used by Charter, Risk Register, Status Report, Gantt.
 */
export async function downloadAsPdf(elementId: string, filename: string): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) { console.error(`printExport: #${elementId} not found`); return; }

  const prevLeft = el.style.left;
  const prevPosition = el.style.position;
  const prevZIndex = el.style.zIndex;

  // Bring on-screen so the layout engine measures/renders it
  el.style.position = 'fixed';
  el.style.left = '0';
  el.style.top = '0';
  el.style.zIndex = '-9999';

  try {
    const canvas = await elementToCanvas(el);
    await canvasToPdf(canvas, filename);
  } finally {
    el.style.left = prevLeft;
    el.style.position = prevPosition;
    el.style.zIndex = prevZIndex;
  }
}

/**
 * Captures any visible DOM element and downloads as PDF.
 * Used by KPI Dashboard and Project Overview.
 */
export async function downloadElementAsPdf(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await elementToCanvas(el);
  await canvasToPdf(canvas, filename);
}
