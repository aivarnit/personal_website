import { createModal } from './modal.js';

export function createResumeViewer(dialog, resumePath) {
  const preview = dialog.querySelector('.resume-preview');
  const openFile = dialog.querySelector('.resume-open-file');
  const download = dialog.querySelector('.resume-download');
  const controls = dialog.querySelector('.resume-controls');
  const zoomIn = dialog.querySelector('[data-zoom="in"]');
  const zoomOut = dialog.querySelector('[data-zoom="out"]');
  const fit = dialog.querySelector('[data-zoom="fit"]');
  let loadingTask;
  let pdf;
  let zoom = 1;
  let revision = 0;
  let pageWidth = 0;
  let resizeTimer;
  const modal = createModal(dialog, {
    onClose() {
      revision++;
      clearTimeout(resizeTimer);
      loadingTask?.destroy().catch(() => {});
      loadingTask = null;
      pdf = null;
      preview.replaceChildren();
      preview.setAttribute('aria-busy', 'false');
      controls.hidden = true;
      openFile.hidden = true;
      download.hidden = true;
    },
  });

  function message(title, description) {
    const wrapper = document.createElement('div');
    wrapper.className = 'resume-placeholder';
    wrapper.setAttribute('role', 'status');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = description;
    wrapper.append(heading, text);
    preview.replaceChildren(wrapper);
  }

  async function renderPages() {
    if (!pdf) return;
    const pdfDocument = pdf;
    const current = ++revision;
    preview.setAttribute('aria-busy', 'true');
    pageWidth = Math.max(200, preview.clientWidth - 32);
    const pages = window.document.createElement('div');
    pages.className = 'resume-pages';
    zoomIn.disabled = zoom >= 2;
    zoomOut.disabled = zoom <= .75;
    fit.textContent = zoom === 1 ? 'Fit width' : `${Math.round(zoom * 100)}%`;
    try {
      for (let number = 1; number <= pdfDocument.numPages; number++) {
        const page = await pdfDocument.getPage(number);
        if (current !== revision) return;
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: pageWidth * zoom / original.width });
        const ratio = Math.min(devicePixelRatio || 1, 2);
        const section = window.document.createElement('section');
        section.className = 'resume-page';
        section.style.width = `${viewport.width}px`;
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.setAttribute('aria-hidden', 'true');
        await page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] }).promise;
        if (current !== revision) return;
        // An equivalent text representation keeps the visual preview readable
        // to screen readers without handing focus to a native browser plugin.
        const text = await page.getTextContent();
        const heading = window.document.createElement('h3');
        heading.className = 'sr-only';
        heading.textContent = `Resume page ${number} of ${pdfDocument.numPages}`;
        const accessibleText = window.document.createElement('p');
        accessibleText.className = 'sr-only';
        accessibleText.textContent = text.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        section.append(heading, canvas, accessibleText);
        pages.append(section);
      }
      if (current !== revision || !dialog.open) return;
      preview.replaceChildren(pages);
      preview.setAttribute('aria-busy', 'false');
    } catch {
      if (current !== revision || !dialog.open) return;
      preview.setAttribute('aria-busy', 'false');
      controls.hidden = true;
      message('Preview unavailable.', 'Open the PDF in a new tab or download it below to read the resume.');
    }
  }

  zoomIn.addEventListener('click', () => { zoom = Math.min(2, zoom + .25); renderPages(); });
  zoomOut.addEventListener('click', () => { zoom = Math.max(.75, zoom - .25); renderPages(); });
  fit.addEventListener('click', () => { zoom = 1; renderPages(); });
  const resizeObserver = new ResizeObserver(() => {
    if (!pdf || !dialog.open || Math.abs(preview.clientWidth - 32 - pageWidth) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPages, 120);
  });
  resizeObserver.observe(preview);

  return async function openResume() {
    if (dialog.open) return;
    const current = ++revision;
    zoom = 1;
    controls.hidden = true;
    openFile.hidden = true;
    download.hidden = true;
    modal.open();
    preview.setAttribute('aria-busy', 'false');
    if (!resumePath) {
      message('Resume coming soon.', 'The resume PDF will be available here soon.');
      return;
    }
    message('Loading resume…', 'Preparing the document preview.');
    preview.setAttribute('aria-busy', 'true');
    const url = new URL(resumePath, location.href);
    openFile.href = url.href;
    download.href = url.href;
    openFile.hidden = false;
    download.hidden = false;
    try {
      // The renderer and worker are local, and load only when Resume is opened.
      const renderer = await import('./vendor/pdf.min.mjs?v=5.4.296');
      if (current !== revision || !dialog.open) return;
      renderer.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs?v=5.4.296', import.meta.url).href;
      loadingTask = renderer.getDocument({
        url: url.href,
        isEvalSupported: false,
        useSystemFonts: false,
        standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
      });
      pdf = await loadingTask.promise;
      if (current !== revision || !dialog.open) return;
      dialog.querySelector('.resume-page-count').textContent = `${pdf.numPages} ${pdf.numPages === 1 ? 'page' : 'pages'}`;
      controls.hidden = false;
      openFile.hidden = false;
      download.hidden = false;
      await renderPages();
    } catch (error) {
      if (current !== revision || !dialog.open) return;
      preview.setAttribute('aria-busy', 'false');
      if (error.name === 'MissingPDFException' || error.status === 404) {
        openFile.hidden = true;
        download.hidden = true;
        message('Resume coming soon.', 'The resume file is currently unavailable. Please connect by email or LinkedIn.');
      } else {
        message('Preview unavailable.', 'Open the PDF in a new tab or download it below to read the resume.');
      }
    }
  };
}
