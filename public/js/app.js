(async () => {
  const cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({ maxFileMB: 25, maxFiles: 10 }));

  const icon = (d) => `<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
  const fmt = (b) => (b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB');

  const TOOLS = [
    { id: 'merge', title: 'Merge PDF', desc: 'Combine several PDFs into one, in the order you choose.', endpoint: '/api/pdf/merge', field: 'files', noun: 'PDF', ext: ['.pdf'], accept: '.pdf,application/pdf', multiple: true, min: 2, reorder: true, action: 'Merge PDF', icon: 'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5' },
    { id: 'pdf-to-word', title: 'PDF to Word', desc: 'Turn a PDF into an editable Word document.', endpoint: '/api/pdf-to-word', field: 'file', noun: 'PDF', ext: ['.pdf'], accept: '.pdf,application/pdf', action: 'Convert to Word', icon: 'M14 3v5h5M7 3h7l5 5v13H7V3zM10 13h6M10 17h6' },
    { id: 'word-to-pdf', title: 'Word to PDF', desc: 'Convert a DOC or DOCX file into a PDF.', endpoint: '/api/word-to-pdf', field: 'file', noun: 'DOC or DOCX', ext: ['.doc', '.docx'], accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', action: 'Convert to PDF', icon: 'M7 7h13m-4-4 4 4-4 4M17 17H4m4-4-4 4 4 4' },
    { id: 'pdf-to-jpg', title: 'PDF to JPG', desc: 'Render every PDF page as a JPG image.', endpoint: '/api/pdf-to-jpg', field: 'file', noun: 'PDF', ext: ['.pdf'], accept: '.pdf,application/pdf', action: 'Convert to JPG', icon: 'M4 5h16v14H4V5zM4 16l5-5 4 4 3-3 4 4' },
    { id: 'jpg-to-pdf', title: 'JPG to PDF', desc: 'Put one or more JPG images into a single PDF.', endpoint: '/api/jpg-to-pdf', field: 'files', noun: 'JPG', ext: ['.jpg', '.jpeg'], accept: '.jpg,.jpeg,image/jpeg', multiple: true, min: 1, reorder: true, preview: true, action: 'Create PDF', icon: 'M12 16V4m-5 5 5-5 5 5M4 20h16' }
  ];
  const href = (t) => `/tools/${t.id}.html`;

  // ----- header -----
  const link = 'rounded px-1 text-slate-700 hover:text-brand-700';
  document.getElementById('site-header').replaceWith(html(`
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <a href="/" class="leading-tight"><span class="block text-lg font-extrabold tracking-tight text-brand-700">PDF TOOLKIT</span><span class="block text-xs text-slate-600">Simple PDF tools for personal use</span></a>
        <nav aria-label="Main" class="flex gap-5 text-sm font-medium">
          <a class="${link}" href="/">Home</a><a class="${link}" href="/#tools">Tools</a><a class="${link}" href="/#about">About</a>
        </nav>
      </div>
    </header>`));

  const page = document.body.dataset.tool;

  // ----- homepage cards -----
  if (page === 'home') {
    document.getElementById('cards').append(...TOOLS.map((t) => html(`
      <a href="${href(t)}" class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">${icon(t.icon)}</span>
        <h3 class="mt-4 text-lg font-semibold">${t.title}</h3>
        <p class="mt-1 flex-1 text-sm text-slate-600">${t.desc}</p>
        <span class="mt-5 inline-flex w-fit rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white group-hover:bg-brand-800">Open Tool</span>
      </a>`)));
    return;
  }

  // ----- tool page (reusable uploader) -----
  const tool = TOOLS.find((t) => t.id === page);
  const root = document.getElementById('tool');
  root.innerHTML = `
    <h1 class="text-3xl font-bold">${tool.title}</h1>
    <p class="mt-2 text-slate-600">${tool.desc}</p>
    <label id="drop" for="file" class="mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition hover:border-brand-700 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700">
      <span class="text-brand-700">${icon('M12 16V4m-5 5 5-5 5 5M4 20h16')}</span>
      <span class="mt-2 font-semibold">Click to upload or drag and drop</span>
      <span class="text-sm text-slate-600">${tool.noun} ${tool.multiple ? 'files' : 'file'}, up to ${cfg.maxFileMB} MB each</span>
      <input id="file" type="file" class="sr-only" accept="${tool.accept}" ${tool.multiple ? 'multiple' : ''}>
    </label>
    <ul id="list" class="mt-6 space-y-2" aria-label="Selected files"></ul>
    <div id="status" role="status" aria-live="polite" class="mt-6"></div>
    <div class="mt-6 flex flex-wrap gap-3">
      <button id="go" type="button" disabled class="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white shadow transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">${tool.action}</button>
      <a id="dl" hidden class="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold transition hover:bg-slate-100">Download</a>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const [input, list, status, go, dl, drop] = ['file', 'list', 'status', 'go', 'dl', 'drop'].map($);
  let files = [], busy = false, dragFrom = null;

  const note = (type, msg, spin) => {
    const c = { info: 'border-slate-300 bg-white text-slate-800', success: 'border-green-300 bg-green-50 text-green-900', error: 'border-red-300 bg-red-50 text-red-900' }[type];
    status.innerHTML = `<div class="flex items-center gap-3 rounded-xl border p-4 ${c}">${spin ? '<span class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"></span>' : ''}<span></span></div>`;
    status.querySelector('span:last-child').textContent = msg;
  };
  const resetResult = () => { dl.hidden = true; status.innerHTML = ''; };

  function add(picked) {
    const ok = [];
    for (const f of picked) {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!tool.ext.includes(ext)) return note('error', `Only ${tool.noun} files are allowed.`);
      if (f.size > cfg.maxFileMB * 1048576) return note('error', 'File size exceeds the maximum allowed limit.');
      ok.push(f);
    }
    if (!ok.length) return note('error', `Please select a ${tool.noun} file.`);
    if (tool.multiple && files.length + ok.length > cfg.maxFiles) return note('error', `You can select up to ${cfg.maxFiles} files.`);
    files = tool.multiple ? files.concat(ok) : [ok[0]];
    resetResult(); render();
  }

  const move = (from, to) => { if (to < 0 || to >= files.length) return; files.splice(to, 0, files.splice(from, 1)[0]); render(); };
  const btn = 'rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30';

  function render() {
    list.replaceChildren(...files.map((f, i) => {
      const li = html(`
        <li class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" ${tool.reorder ? 'draggable="true"' : ''}>
          <span class="thumb flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-brand-700"></span>
          <div class="min-w-0 flex-1"><p class="name truncate font-medium"></p><p class="text-sm text-slate-600">${fmt(f.size)}</p></div>
          ${tool.reorder ? `<button type="button" data-up class="${btn}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-down class="${btn}" aria-label="Move down" ${i === files.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
          <button type="button" data-rm class="${btn}" aria-label="Remove file">✕</button>
        </li>`);
      li.querySelector('.name').textContent = f.name;
      const thumb = li.querySelector('.thumb');
      if (tool.preview) { const img = new Image(); img.alt = ''; img.className = 'h-full w-full object-cover'; img.src = URL.createObjectURL(f); img.onload = () => URL.revokeObjectURL(img.src); thumb.append(img); }
      else thumb.innerHTML = icon('M14 3v5h5M7 3h7l5 5v13H7V3z');
      li.querySelector('[data-rm]').onclick = () => { files.splice(i, 1); resetResult(); render(); };
      if (tool.reorder) {
        li.querySelector('[data-up]').onclick = () => move(i, i - 1);
        li.querySelector('[data-down]').onclick = () => move(i, i + 1);
        li.ondragstart = () => { dragFrom = i; };
        li.ondragover = (e) => e.preventDefault();
        li.ondrop = (e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) move(dragFrom, i); dragFrom = null; };
      }
      return li;
    }));
    go.disabled = busy || files.length < (tool.min || 1);
  }

  input.onchange = () => { add([...input.files]); input.value = ''; };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('border-brand-700', 'bg-brand-50'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('border-brand-700', 'bg-brand-50'); }));
  drop.addEventListener('drop', (e) => add([...e.dataTransfer.files]));

  go.onclick = async () => {
    busy = true; go.disabled = true; dl.hidden = true;
    note('info', 'Uploading and processing…', true);
    const fd = new FormData();
    files.forEach((f) => fd.append(tool.field, f));
    try {
      const res = await fetch(tool.endpoint, { method: 'POST', body: fd });
      if (!res.ok) {
        let msg = 'Something went wrong while processing your file.';
        try { msg = (await res.json()).error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const name = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'download';
      const pages = res.headers.get('X-Page-Count');
      dl.href = URL.createObjectURL(blob); dl.download = name; dl.hidden = false; dl.click();
      note('success', `Completed! ${pages ? pages + ' page(s) detected. ' : ''}Your download has started.`);
    } catch (err) {
      note('error', err instanceof TypeError ? 'Could not reach the server. Please try again.' : err.message);
    } finally { busy = false; render(); }
  };
  render();
})();
