export interface PdfSlice {
  sourceY: number;
  sourceHeight: number;
  renderedHeight: number;
}

export function calculatePdfSlices(canvasWidth: number, canvasHeight: number, printableWidth: number, printableHeight: number, forcedBreaks: number[] = []): PdfSlice[] {
  if (canvasWidth <= 0 || canvasHeight <= 0 || printableWidth <= 0 || printableHeight <= 0) return [];
  const scale = printableWidth / canvasWidth;
  const sourcePageHeight = Math.max(1, Math.floor(printableHeight / scale));
  const boundaries = [0, ...forcedBreaks.filter((value) => value > 0 && value < canvasHeight).sort((a, b) => a - b), canvasHeight]
    .filter((value, index, values) => index === 0 || value !== values[index - 1]);
  const slices: PdfSlice[] = [];
  for (let boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex += 1) {
    const segmentStart = boundaries[boundaryIndex];
    const segmentEnd = boundaries[boundaryIndex + 1];
    if (segmentStart === undefined || segmentEnd === undefined) continue;
    for (let sourceY = segmentStart; sourceY < segmentEnd; sourceY += sourcePageHeight) {
      const sourceHeight = Math.min(sourcePageHeight, segmentEnd - sourceY);
      slices.push({ sourceY, sourceHeight, renderedHeight: sourceHeight * scale });
    }
  }
  return slices;
}

function safeFilename(value: string) {
  return value.trim().replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, '-').toLocaleLowerCase('ru');
}

export async function exportDashboardPdf(root: HTMLElement, options: { focusMall: string; snapshotDate: string }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  root.classList.add('pdf-capture');
  try {
    const canvas = await html2canvas(root, {
      backgroundColor: '#f8fafc',
      scale: Math.min(2, Math.max(1, 16_000 / Math.max(root.scrollWidth, root.scrollHeight))),
      useCORS: true,
      logging: false,
      windowWidth: Math.max(1366, root.scrollWidth),
      onclone: (documentClone) => documentClone.documentElement.classList.add('pdf-rendering'),
    });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const margin = 8;
    const printableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const printableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const rootTop = root.getBoundingClientRect().top;
    const canvasScale = canvas.height / root.scrollHeight;
    const forcedBreaks = [...root.querySelectorAll<HTMLElement>('[data-pdf-page-break-before]')]
      .map((element) => Math.round((element.getBoundingClientRect().top - rootTop) * canvasScale));
    const slices = calculatePdfSlices(canvas.width, canvas.height, printableWidth, printableHeight, forcedBreaks);

    slices.forEach((slice, index) => {
      if (index > 0) pdf.addPage('a4', 'landscape');
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = slice.sourceHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('Не удалось подготовить страницу PDF');
      context.fillStyle = '#f8fafc';
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, slice.sourceY, canvas.width, slice.sourceHeight, 0, 0, canvas.width, slice.sourceHeight);
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, printableWidth, slice.renderedHeight, undefined, 'FAST');
    });

    pdf.setProperties({
      title: `Tenant Mix — ${options.focusMall}`,
      subject: `Срез tenant mix на ${options.snapshotDate}`,
      creator: 'Tenant Mix Analytics',
    });
    pdf.save(`tenant-mix-${safeFilename(options.focusMall)}-${options.snapshotDate}.pdf`);
  } finally {
    root.classList.remove('pdf-capture');
  }
}
