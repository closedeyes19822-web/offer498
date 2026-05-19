import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Export the .print-area element to A4 PDF, one page per .print-page-wrap.
 * Renders each page at high resolution and fits to A4 portrait (210x297mm).
 */
export async function exportPrintAreaToPdf(filename = "offers.pdf") {
  const area = document.querySelector(".print-area") as HTMLElement | null;
  if (!area) throw new Error("print-area not found");

  const pages = Array.from(area.querySelectorAll<HTMLElement>(".print-page-wrap"));
  if (pages.length === 0) throw new Error("no pages to export");

  // Force print-like layout: clone area off-screen at exact A4 size
  const offscreen = document.createElement("div");
  offscreen.style.position = "fixed";
  offscreen.style.top = "-10000px";
  offscreen.style.left = "0";
  offscreen.style.background = "white";
  offscreen.style.zIndex = "-1";
  offscreen.className = "pdf-export-root";
  document.body.appendChild(offscreen);

  // Inject scoped print-equivalent style for the clone
  const style = document.createElement("style");
  style.textContent = `
    .pdf-export-root { background: white; }
    .pdf-export-root .print-page-wrap {
      width: 21cm; height: 29.7cm;
      padding: 1.65cm 1.1cm;
      box-sizing: border-box;
      display: flex; align-items: flex-start; justify-content: center;
      background: white;
      transform: none !important;
    }
    .pdf-export-root .preview-scale-wrap { width: auto !important; height: auto !important; overflow: visible !important; }
    .pdf-export-root .preview-scale-wrap > .preview-grid { transform: none !important; }
    .pdf-export-root .preview-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 6cm) !important;
      grid-template-rows: repeat(2, 13cm) !important;
      column-gap: 0.4cm !important;
      row-gap: 0.4cm !important;
      margin: 0 !important;
    }
    .pdf-export-root .preview-card {
      width: 6cm !important; height: 13cm !important;
      box-shadow: none !important;
    }
  `;
  offscreen.appendChild(style);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  try {
    for (let i = 0; i < pages.length; i++) {
      const clone = pages[i].cloneNode(true) as HTMLElement;
      offscreen.appendChild(clone);
      // wait a tick for layout/canvas (barcodes/QR are already painted)
      await new Promise((r) => setTimeout(r, 50));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 210, 297);

      offscreen.removeChild(clone);
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(offscreen);
  }
}
