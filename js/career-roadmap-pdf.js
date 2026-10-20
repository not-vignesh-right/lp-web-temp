/* Builds the "My Career Roadmap" PDF in the browser: the map the visitor made,
   the details of the steps on it, a logo watermark and the LessonPlan contact line on every page.
   Loads pdf-lib only when the visitor asks for the download. */
(function () {
    'use strict';
    var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    var WARN = 'Please note: cut-offs, past-year criteria, dates, fees and eligibility shown here are approximate and may not be exact. They change every year. This guide is for general information only and is not an official source. Always confirm on the official website of the exam body before you apply.';
    var FOOT = 'LessonPlan | Above Omega Clinic, Kogilu, Yelahanka, Bangalore 560064 | +91 80505 12005 | info@lessonplan.co.in | www.lessonplan.co.in';
    var COLORS = { door: '#003366', group: '#0b5ca8', stage: '#4a6b8a', exam: '#ff6600', course: '#1b8a5a', career: '#7a3fb0', next: '#c58a00' };
    var PW = 595.28, PH = 841.89, M = 40;

    function loadLib() {
        if (window.PDFLib) return Promise.resolve(window.PDFLib);
        return new Promise(function (ok, no) {
            var s = document.createElement('script'); s.src = LIB; s.onload = function () { ok(window.PDFLib); };
            s.onerror = function () { no(new Error('pdf-lib could not load')); };
            document.head.appendChild(s);
        });
    }
    function clean(t) { return String(t == null ? '' : t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ†•]/g, ''); }
    function hex(L, c) { var n = parseInt(c.slice(1), 16); return L.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }

    function make(data) {
        return loadLib().then(function (L) {
            return Promise.all([L.PDFDocument.create(), fetch('assets/logo-removebg.png').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; })]).then(function (r) {
                var doc = r[0], logoBytes = r[1];
                return Promise.all([doc.embedFont(L.StandardFonts.Helvetica), doc.embedFont(L.StandardFonts.HelveticaBold), logoBytes ? doc.embedPng(logoBytes) : null]).then(function (f) {
                    return build(L, doc, f[0], f[1], f[2], data);
                });
            });
        });
    }

    function build(L, doc, font, bold, logo, data) {
        var pages = [], page, y;
        var navy = hex(L, '#003366'), grey = L.rgb(0.35, 0.4, 0.46);
        function newPage() {
            page = doc.addPage([PW, PH]); pages.push(page);
            if (logo) {
                var w = PW * 0.62, hh = w * logo.height / logo.width;
                page.drawImage(logo, { x: (PW - w) / 2, y: (PH - hh) / 2, width: w, height: hh, opacity: 0.08 });
            }
            y = PH - M;
        }
        function wrap(text, f, size, width) {
            var out = [], words = clean(text).split(/\s+/), line = '';
            words.forEach(function (w) {
                var t = line ? line + ' ' + w : w;
                if (f.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
            });
            if (line) out.push(line);
            return out;
        }
        function need(h) { if (y - h < M + 34) newPage(); }
        function text(t, o) {
            o = o || {}; var f = o.bold ? bold : font, size = o.size || 10, lh = size * 1.4, width = (o.width || (PW - 2 * M)) - (o.indent || 0);
            wrap(t, f, size, width).forEach(function (ln) {
                need(lh); y -= lh;
                page.drawText(ln, { x: M + (o.indent || 0), y: y + size * 0.25, size: size, font: f, color: o.color || L.rgb(0.1, 0.12, 0.16) });
            });
            y -= (o.after == null ? 4 : o.after);
        }
        function label(t) { need(24); y -= 6; text(t.toUpperCase(), { bold: true, size: 8, color: grey, after: 2 }); }

        /* ---- page 1: title and map ---- */
        newPage();
        page.drawRectangle({ x: 0, y: PH - 70, width: PW, height: 70, color: navy });
        page.drawText('My Career Roadmap', { x: M, y: PH - 38, size: 22, font: bold, color: L.rgb(1, 1, 1) });
        page.drawText('Made with the LessonPlan Career Roadmap', { x: M, y: PH - 56, size: 10, font: font, color: L.rgb(0.85, 0.9, 0.96) });
        y = PH - 90;
        text('Your path: ' + data.path.join('  >  '), { bold: true, size: 11, color: navy, after: 10 });
        text(WARN, { size: 8.5, color: hex(L, '#8a4b00'), after: 10 });
        drawMap(L, data, font, bold, wrap, function (v) { y = v; }, function () { return y; }, function () { return page; }, newPage, hex);

        /* ---- detail pages ---- */
        if (data.details.length) {
            newPage();
            text('Details for the steps on your map', { bold: true, size: 15, color: navy, after: 8 });
            data.details.forEach(function (d) {
                need(80); y -= 8;
                var col = hex(L, COLORS[d.type] || '#003366');
                page.drawRectangle({ x: M, y: y - 3, width: 4, height: 14, color: col });
                text((d.type === 'career' ? 'Career: ' : 'Exam: ') + d.title, { bold: true, size: 12, color: navy, indent: 10, after: 3 });
                if (d.simple) text(d.simple, { size: 10, after: 3 });
                if (d.body) text(d.body, { size: 9, color: grey, after: 3 });
                if (d.facts && d.facts.length) text(d.facts.join('   |   '), { bold: true, size: 9, color: hex(L, '#b34700'), after: 3 });
                if (d.rows && d.rows.length) {
                    label('Pattern');
                    d.rows.forEach(function (r) { text(r[0] + ': ' + r[1] + ' questions, ' + r[2] + ' marks', { size: 9, indent: 8, after: 1 }); });
                    if (d.total) text(d.total, { bold: true, size: 9, indent: 8, after: 3 });
                } else if (d.pattern) { label('Pattern'); text(d.pattern, { size: 9 }); }
                if (d.marking) { label('Marking'); text(d.marking, { size: 9 }); }
                if (d.eligibility) { label('Who can apply'); text(d.eligibility, { size: 9 }); }
                if (d.leads) { label('Leads to'); text(d.leads, { size: 9 }); }
                if (d.route && d.route.length) { label('Your route'); d.route.forEach(function (s, i) { text((i + 1) + '. ' + s, { size: 9, indent: 8, after: 1 }); }); }
                if (d.official) text('Official website: ' + d.official, { size: 9, color: hex(L, '#0b5ca8'), after: 6 });
                y -= 8;
                page.drawLine({ start: { x: M, y: y }, end: { x: PW - M, y: y }, thickness: 0.5, color: L.rgb(0.8, 0.84, 0.88) });
            });
        }

        /* ---- closing ---- */
        need(120); y -= 14;
        text(WARN + ' Details are for the ' + data.updated + '.', { size: 9, color: grey, after: 10 });
        text('Want a plan made just for you?', { bold: true, size: 13, color: navy, after: 3 });
        text('Talk to a LessonPlan counsellor. Call or WhatsApp +91 80505 12005, email info@lessonplan.co.in or visit www.lessonplan.co.in.', { size: 10 });

        /* ---- footers ---- */
        var n = pages.length;
        pages.forEach(function (p, i) {
            p.drawLine({ start: { x: M, y: 32 }, end: { x: PW - M, y: 32 }, thickness: 0.5, color: L.rgb(0.75, 0.8, 0.86) });
            var size = 7, w = font.widthOfTextAtSize(FOOT, size);
            p.drawText(FOOT, { x: (PW - w) / 2, y: 20, size: size, font: font, color: navy });
            if (i === 0) { p.drawText('Page 1 of ' + n, { x: PW - M - font.widthOfTextAtSize('Page 1 of ' + n, 8), y: PH - 82, size: 8, font: font, color: grey }); return; }
            var t = 'Page ' + (i + 1) + ' of ' + n;
            p.drawText(t, { x: PW - M - font.widthOfTextAtSize(t, 8), y: PH - 24, size: 8, font: font, color: grey });
        });
        doc.setTitle('My Career Roadmap - LessonPlan'); doc.setAuthor('LessonPlan');
        return doc.save();
    }

    /* the mind map: rows of bubbles joined by curved lines */
    function drawMap(L, data, font, bold, wrap, setY, getY, getPage, newPage, hexFn) {
        return drawMap2(L, data, font, bold, wrap, setY, getY, getPage, newPage, hexFn);
    }
    function drawMap2(L, data, font, bold, wrap, setY, getY, getPage, newPage, hexFn) {
        var perLine = 3, bw = 158, gap = (PW - 2 * M - perLine * bw) / (perLine - 1), bh = 38, lineGap = 14, rowGap = 34;
        var prevSel = null, prevLine = null;
        data.levels.forEach(function (lv, li) {
            var items = lv.items, lines = [];
            for (var i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine));
            var rowH = 16 + lines.length * (bh + lineGap);
            if (getY() - rowH < M + 40) { newPage(); setY(PH - M); prevSel = null; }
            var pg = getPage(), top = getY();
            var yy = top - 16, placed = [], newSel = null;
            lines.forEach(function (ln, k) {
                var total = ln.length * bw + (ln.length - 1) * gap, x0 = (PW - total) / 2, row = [];
                ln.forEach(function (it, j) {
                    var x = x0 + j * (bw + gap), by = yy - bh;
                    var col = hexFn(L, COLORS[it.type] || '#003366');
                    var dim = lv.hasSel && !it.sel;
                    pg.drawRectangle({ x: x, y: by, width: bw, height: bh, color: it.sel || !lv.hasSel ? col : L.rgb(0.92, 0.94, 0.96), borderColor: col, borderWidth: it.sel ? 2.5 : 1, opacity: dim ? 1 : 1 });
                    var lines2 = wrap(it.label, bold, 8, bw - 12).slice(0, 3), th = lines2.length * 10, ty = by + (bh + th) / 2 - 8;
                    lines2.forEach(function (t, q) {
                        var c = dim ? L.rgb(0.3, 0.35, 0.42) : L.rgb(1, 1, 1);
                        pg.drawText(t, { x: x + (bw - bold.widthOfTextAtSize(t, 8)) / 2, y: ty - q * 10, size: 8, font: bold, color: c });
                    });
                    var rec = { cx: x + bw / 2, top: yy, bottom: by, it: it }; row.push(rec); if (it.sel) newSel = rec;
                });
                placed.push(row); yy -= bh + lineGap;
            });
            // curved lines from the chosen bubble above
            if (prevSel) {
                placed.forEach(function (row, k) {
                    row.forEach(function (rec) {
                        var from = k === 0 ? prevSel : nearest(placed[k - 1], rec.cx);
                        curve(L, pg, from.cx, from.bottom, rec.cx, rec.top);
                    });
                });
            }
            var cap = clean(lv.title);
            var cw = bold.widthOfTextAtSize(cap, 8) + 14;
            pg.drawRectangle({ x: (PW - cw) / 2, y: top - 14, width: cw, height: 14, color: L.rgb(1, 1, 1) });
            pg.drawText(cap, { x: (PW - bold.widthOfTextAtSize(cap, 8)) / 2, y: top - 9, size: 8, font: bold, color: L.rgb(0.35, 0.4, 0.46) });
            prevSel = newSel; setY(yy - rowGap + lineGap);
        });
    }
    function nearest(list, x) { var b = list[0], d = 1e9; list.forEach(function (c) { var v = Math.abs(c.cx - x); if (v < d) { d = v; b = c; } }); return b; }
    function curve(L, pg, x1, y1, x2, y2) {
        var dy = Math.max(8, (y1 - y2) * 0.5);
        // pdf coordinates: y grows upward, so the curve goes down the page
        var path = 'M' + x1 + ' ' + (PH - y1) + ' C' + x1 + ' ' + (PH - (y1 - dy)) + ' ' + x2 + ' ' + (PH - (y2 + dy)) + ' ' + x2 + ' ' + (PH - y2);
        pg.drawSvgPath(path, { x: 0, y: PH, borderColor: L.rgb(0, 0.2, 0.4), borderWidth: 1.6, borderOpacity: 0.7 });
    }

    window.CRPdf = { make: make };
}());
