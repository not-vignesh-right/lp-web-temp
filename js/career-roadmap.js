/* Career Roadmap page: a step-by-step map. Tap a bubble and its next step opens.
   Search opens a whole route at once. Exams and careers open a side panel. */
(function () {
    'use strict';

    var BASE = 'data/career/';
    var mapEl = document.getElementById('crMap');
    if (!mapEl) return;

    var el = {
        explorer: document.getElementById('explorer'),
        split: document.getElementById('crSplit'),
        scroll: document.getElementById('crScroll'),
        sub: document.getElementById('crSub'),
        tip: document.getElementById('crTip'),
        reset: document.getElementById('crReset'),
        download: document.getElementById('crDownload'),
        side: document.getElementById('crSide'),
        sideBody: document.getElementById('crSideBody'),
        close: document.getElementById('crClose'),
        backdrop: document.getElementById('crBackdrop'),
        form: document.getElementById('crSearch'),
        query: document.getElementById('crQuery'),
        msg: document.getElementById('crSearchMsg'),
        chips: document.getElementById('crChips')
    };

    var ICON = { group: 'fa-layer-group', stage: 'fa-flag', exam: 'fa-file-pen', course: 'fa-graduation-cap', career: 'fa-star', next: 'fa-arrow-right' };
    var TITLES = { door: 'Pick a stream', group: 'Pick your subjects', stage: 'Next step', exam: 'How do you get in? Each is a separate choice', course: 'What will you study?', career: 'What can you become?', next: 'What next?' };
    var state = { index: null, exams: null, careers: null, cache: {}, chain: [], hi: null, side: null, cols: 0 };
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = function () { return window.innerWidth <= 900; };

    /* ---------- small helpers ---------- */
    function h(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    function getJSON(url) {
        return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function prepare(d) {
        d.byId = {}; d.out = {}; d.inn = {};
        d.nodes.forEach(function (n) { d.byId[n.id] = n; });
        d.edges.forEach(function (e) {
            (d.out[e[0]] = d.out[e[0]] || []).push(e[1]);
            (d.inn[e[1]] = d.inn[e[1]] || []).push(e[0]);
        });
        return d;
    }
    function walk(map, start) {
        var seen = {}; seen[start] = 1;
        var stack = [start];
        while (stack.length) {
            (map[stack.pop()] || []).forEach(function (y) { if (!seen[y]) { seen[y] = 1; stack.push(y); } });
        }
        return seen;
    }
    function pathMeta(id) {
        for (var i = 0; i < state.index.pathways.length; i++) if (state.index.pathways[i].id === id) return state.index.pathways[i];
        return null;
    }
    function loadPath(id) {
        if (state.cache[id]) return Promise.resolve(state.cache[id]);
        return getJSON(BASE + pathMeta(id).file).then(function (d) { state.cache[id] = prepare(d); return state.cache[id]; });
    }
    function doorById(id) { return state.index.doors.filter(function (d) { return d.id === id; })[0]; }

    /* ---------- bubbles (refs) ---------- */
    function doorRef(d) {
        return { key: 'door:' + d.id, kind: 'door', type: 'door', label: d.title, sub: d.blurb, icon: d.icon, live: d.live, door: d };
    }
    function groupRef(door, g) {
        return { key: 'group:' + g.id, kind: 'group', type: 'group', label: g.label, sub: g.sub, icon: ICON.group, live: !!g.pathway, door: door, group: g, path: g.pathway };
    }
    function nodeRef(d, n, door, group) {
        return { key: 'n:' + d.id + ':' + n.id, kind: 'node', type: n.type, label: n.label, note: n.note, exam: n.exam, id: n.id, pathId: d.id, pathData: d, door: door, group: group, live: true, icon: ICON[n.type] };
    }
    function entryIds(d, g) {
        if (g.entry) return { ids: g.entry, tips: [] };
        var ids = [], tips = [], q = ['choose'], start = d.byId.choose;
        if (start && start.note) tips.push(start.note);
        while (q.length) {
            var cur = q.shift();
            (d.out[cur] || []).forEach(function (id) {
                var m = d.byId[id];
                if (m.type === 'stage') { if (m.note) tips.push(m.note); q.push(id); }
                else if (ids.indexOf(id) < 0) ids.push(id);
            });
        }
        return { ids: ids, tips: tips };
    }
    function entries(door, g, parent) {
        return loadPath(g.pathway).then(function (d) {
            var e = entryIds(d, g);
            parent.levelTitles = d.levelTitles || null;
            parent.tip = e.tips.join(' ');
            return e.ids.map(function (id) { return nodeRef(d, d.byId[id], door, g); });
        });
    }
    function kidsOf(ref) {
        if (ref.kids) return Promise.resolve(ref.kids);
        var p;
        if (ref.kind === 'door') {
            var gs = ref.door.groups || [];
            if (gs.length === 1 && gs[0].pathway) { ref.skipGroup = gs[0]; p = entries(ref.door, gs[0], ref); }
            else p = Promise.resolve(gs.map(function (g) { return groupRef(ref.door, g); }));
        } else if (ref.kind === 'group') {
            p = ref.path ? entries(ref.door, ref.group, ref) : Promise.resolve([]);
        } else {
            var d = ref.pathData;
            p = Promise.resolve((d.out[ref.id] || []).map(function (id) { return nodeRef(d, d.byId[id], ref.door, ref.group); }));
        }
        return p.then(function (k) { ref.kids = k; return k; });
    }
    function colTitle(parent, kids) {
        var type = kids[0].type;
        if (parent === null) return TITLES.door;
        if (type === 'group' && parent.door && parent.door.groupTitle) return parent.door.groupTitle;
        var lt = parent.levelTitles || (parent.pathData && parent.pathData.levelTitles);
        return (lt && lt[type]) || TITLES[type];
    }

    /* ---------- drawing ---------- */
    function nodeEl(ref, level) {
        var sel = state.chain[level];
        var b = h('button', 'cr-node cr-node--' + ref.type);
        b.type = 'button';
        b.setAttribute('data-key', ref.key);
        var ico = h('span', 'cr-node-ico'); ico.setAttribute('aria-hidden', 'true');
        ico.appendChild(h('i', 'fa-solid ' + ref.icon));
        b.appendChild(ico);
        var txt = h('span', 'cr-node-txt');
        txt.appendChild(h('strong', '', ref.label));
        if (ref.sub) txt.appendChild(h('small', '', ref.sub));
        b.appendChild(txt);
        if (!ref.live) { b.classList.add('is-soon'); b.appendChild(h('span', 'cr-soon', 'Soon')); }
        if (sel) {
            if (sel.key === ref.key) { b.classList.add('is-selected'); b.setAttribute('aria-expanded', 'true'); }
            else b.classList.add('is-dim');
        }
        if (state.hi && state.hi[ref.key]) b.classList.add('is-route');
        b.addEventListener('click', function () { pick(level, ref, b); });
        return b;
    }
    function render(animate) {
        var prevRows = state.cols;
        mapEl.textContent = '';
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'cr-links'); svg.setAttribute('aria-hidden', 'true');
        mapEl.appendChild(svg);

        var levels = [{ parent: null, kids: state.index.doors.map(doorRef) }];
        state.chain.forEach(function (ref) { if (ref.kids && ref.kids.length) levels.push({ parent: ref, kids: ref.kids }); });
        var cur = levels.length - 1;
        levels.forEach(function (lv, i) {
            var row = h('div', 'cr-row' + (i < cur ? ' is-single' : ''));
            if (animate && i >= prevRows && i > 0) row.classList.add('is-new');
            row.appendChild(h('p', 'cr-cap', colTitle(lv.parent, lv.kids)));
            var nodes = h('div', 'cr-nodes');
            var kids = i < cur ? [state.chain[i]] : lv.kids;
            kids.forEach(function (ref) { nodes.appendChild(nodeEl(ref, i)); });
            row.appendChild(nodes);
            mapEl.appendChild(row);
        });
        state.cols = levels.length;

        el.reset.hidden = state.chain.length === 0;
        syncTalkLinks();
        if (el.download) el.download.hidden = state.chain.length === 0;
        var names = state.chain.map(function (r) { return r.label; });
        el.sub.textContent = names.length ? 'Your path: ' + names.join('  >  ') + '.  Tap a chosen bubble to change it.' : 'Tap a bubble to open it. New bubbles appear as you go.';
        setTimeout(function () { drawLinks(svg); }, 30);
        if (animate) setTimeout(revealNewest, 90);
        updateUrl();
    }
    function nearestByX(list, n) {
        var nx = n.getBoundingClientRect().left + n.offsetWidth / 2, best = list[0], bd = 1e9;
        list.forEach(function (c) { var d = Math.abs(c.getBoundingClientRect().left + c.offsetWidth / 2 - nx); if (d < bd) { bd = d; best = c; } });
        return best;
    }
    function drawLinks(svg) {
        svg.textContent = '';
        var r = mapEl.getBoundingClientRect();
        var rows = mapEl.querySelectorAll('.cr-row');
        function link(from, to) {
            var A = from.getBoundingClientRect(), B = to.getBoundingClientRect();
            var x1 = A.left + A.width / 2 - r.left, y1 = A.bottom - r.top, x2 = B.left + B.width / 2 - r.left, y2 = B.top - r.top, dy = Math.max(16, (y2 - y1) * 0.5);
            var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + dy) + ' ' + x2 + ' ' + (y2 - dy) + ' ' + x2 + ' ' + y2);
            svg.appendChild(p);
        }
        for (var k = 0; k < rows.length - 1; k++) {
            var from = rows[k].querySelector('.cr-node.is-selected');
            if (!from) continue;
            var kids = Array.prototype.slice.call(rows[k + 1].querySelectorAll('.cr-node'));
            var lines = [];
            kids.forEach(function (n) {
                var t = Math.round(n.getBoundingClientRect().top), g = null;
                lines.forEach(function (l) { if (Math.abs(l.t - t) < 8) g = l; });
                if (g) g.n.push(n); else lines.push({ t: t, n: [n] });
            });
            lines.sort(function (a, b) { return a.t - b.t; });
            lines.forEach(function (line, li) {
                line.n.forEach(function (n) { link(li === 0 ? from : nearestByX(lines[li - 1].n, n), n); });
            });
        }
    }
    window.addEventListener('resize', function () { var s = mapEl.querySelector('.cr-links'); if (s) drawLinks(s); });
    function revealNewest() {
        var rows = mapEl.querySelectorAll('.cr-row');
        var last = rows[rows.length - 1];
        if (!last) return;
        var r = last.getBoundingClientRect(), head = 96;
        if (r.top > window.innerHeight * 0.55 || r.top < head) {
            window.scrollTo({ top: window.pageYOffset + r.top - head - 40, behavior: reduced ? 'auto' : 'smooth' });
        }
    }    function setTip(text, linkText, href) {
        el.tip.textContent = '';
        if (!text) return;
        el.tip.appendChild(document.createTextNode(text));
        if (linkText) {
            el.tip.appendChild(document.createTextNode(' '));
            var a = h('a', 'cr-d-link', linkText); a.href = href;
            el.tip.appendChild(a);
        }
    }
    function updateUrl() {
        var last = state.chain[state.chain.length - 1];
        var q = (last && last.kind === 'node') ? '?path=' + encodeURIComponent(last.pathId) + '&node=' + encodeURIComponent(last.id) : '';
        if (location.search !== q) history.replaceState(null, '', location.pathname + q);
    }

    /* ---------- tapping bubbles ---------- */
    function pick(level, ref) {
        if (!ref.live) {
            setTip('This guide is coming soon. Ask a counsellor and we will help you right away.', 'Talk to us', talkUrl(ref.label));
            return;
        }
        if (ref.type === 'next') { startOver(ref.note, true); return; }
        var cur = state.chain[level];
        if (cur && cur.key === ref.key) {
            state.chain = state.chain.slice(0, level); state.hi = null; closeSide(); setTip(''); render(false); return;
        }
        state.chain = state.chain.slice(0, level); state.chain.push(ref); state.hi = null;
        kidsOf(ref).then(function () {
            render(true);
            var panel = ref.kind === 'node' && (ref.type === 'exam' || ref.type === 'career');
            if (panel) showSide(ref); else closeSide();
            setTip(panel ? '' : (ref.kind === 'node' ? ref.note : ref.tip) || '');
        });
    }
    function startOver(tip, pulse) {
        state.chain = []; state.hi = null; closeSide(); setTip(tip || ''); render(false);
        if (pulse) {
            Array.prototype.forEach.call(mapEl.querySelectorAll('.cr-node--door'), function (n) { n.classList.add('cr-pulse'); });
            el.explorer.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        }
    }
    el.reset.addEventListener('click', function () { startOver('', false); });

    /* ---------- contact links, pre-filled with the visitor's route ---------- */
    function routeText() { return state.chain.map(function (r) { return r.label; }).join(' > '); }
    function talkUrl(topic) {
        var t = topic || (state.chain.length ? state.chain[state.chain.length - 1].label : 'Career guidance');
        return 'contact.html?topic=' + encodeURIComponent(t) + '&path=' + encodeURIComponent(routeText() || 'Career Roadmap') + '&from=career-roadmap';
    }
    function waUrl() {
        var route = routeText();
        var msg = route ? 'Hello LessonPlan, I am exploring the Career Roadmap: ' + route + '. Please guide me.' : 'Hello LessonPlan, I need guidance from the Career Roadmap.';
        return 'https://wa.me/918050512005?text=' + encodeURIComponent(msg);
    }
    function syncTalkLinks() {
        var a = document.getElementById('crCtaTalk');
        if (a) a.href = talkUrl('');
        var t = document.getElementById('crHelpTalk'), w = document.getElementById('crHelpWa');
        if (t) t.href = talkUrl('');
        if (w) w.href = waUrl();
    }

    /* ---------- download my roadmap (PDF) ---------- */
    function pdfData() {
        var levels = [{ parent: null, kids: state.index.doors.map(doorRef) }];
        state.chain.forEach(function (ref) { if (ref.kids && ref.kids.length) levels.push({ parent: ref, kids: ref.kids }); });
        var cur = levels.length - 1;
        var out = levels.map(function (lv, i) {
            var chosen = state.chain[i], single = i < cur;
            var kids = single ? [chosen] : lv.kids;
            return {
                title: colTitle(lv.parent, lv.kids), hasSel: single || !!chosen,
                items: kids.map(function (k) { return { label: k.label, type: k.type, sel: !!chosen && chosen.key === k.key }; })
            };
        });
        var seen = {}, details = [];
        function addDetail(ref) {
            if (seen[ref.key] || (ref.type !== 'exam' && ref.type !== 'career')) return;
            seen[ref.key] = 1;
            if (ref.type === 'career') {
                details.push({ type: 'career', title: ref.label, simple: ref.note, route: state.chain.map(function (r) { return r.label; }) });
            } else {
                var x = state.exams[ref.exam]; if (!x) return;
                details.push({ type: 'exam', title: x.name, simple: x.simple, body: x.body, facts: [x.frequency, x.month, x.mode].filter(Boolean),
                    rows: x.rows, total: x.total, pattern: x.pattern, marking: x.marking, eligibility: x.eligibility, leads: x.leads, official: x.official });
            }
        }
        state.chain.forEach(addDetail);
        var last = levels[cur], extra = 0;
        if (last) last.kids.forEach(function (k) { if (extra < 8 && !seen[k.key] && (k.type === 'exam' || k.type === 'career')) { extra++; addDetail(k); } });
        return { path: state.chain.map(function (r) { return r.label; }), levels: out, details: details, updated: state.index.updated };
    }
    var busy = false;
    function downloadRoadmap() {
        if (busy || !window.CRPdf || !state.chain.length) return;
        busy = true;
        var btns = [el.download].concat(Array.prototype.slice.call(document.querySelectorAll('.cr-d-actions button')));
        var old = el.download ? el.download.innerHTML : '';
        btns.forEach(function (b) { if (b) b.disabled = true; });
        if (el.download) el.download.textContent = 'Making your PDF...';
        window.CRPdf.make(pdfData()).then(function (bytes) {
            var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            var a = document.createElement('a'); a.href = url; a.download = 'LessonPlan-My-Career-Roadmap.pdf';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }).catch(function () {
            setTip('The PDF could not be made right now. Please check your internet and try again.', 'Talk to us', talkUrl('Career Roadmap PDF'));
        }).then(function () {
            busy = false; btns.forEach(function (b) { if (b) b.disabled = false; });
            if (el.download) el.download.innerHTML = old;
        });
    }
    if (el.download) el.download.addEventListener('click', downloadRoadmap);

    /* ---------- side panel ---------- */
    function showSide(ref) {
        state.side = ref;
        var b = el.sideBody; b.textContent = '';
        var isCareer = ref.type === 'career';
        var kind = h('span', 'cr-d-kind' + (isCareer ? ' cr-d-kind--career' : ''), isCareer ? 'Career' : 'Entrance exam');
        b.appendChild(kind);

        var pathTitle = (ref.door.title === 'Science' && ref.group && ref.group.label ? 'Science ' + ref.group.label : ref.door.title);
        var topic, x = null;
        if (isCareer) {
            topic = ref.label;
            var t = h('h3', 'cr-d-title', ref.label); t.id = 'crSideTitle'; b.appendChild(t);
            if (ref.note) b.appendChild(h('p', 'cr-d-simple', ref.note));
            b.appendChild(h('div', 'cr-d-label', 'Your route'));
            var ol = h('ol', 'cr-steps');
            state.chain.forEach(function (r) { ol.appendChild(h('li', '', r.label)); });
            b.appendChild(ol);
            b.appendChild(h('div', 'cr-d-label', 'Want a plan made just for you?'));
            b.appendChild(h('p', 'cr-d-text', 'Talk to a LessonPlan counsellor. We will help you pick the right steps and exams for ' + ref.label + '.'));
        } else {
            x = state.exams[ref.exam];
            if (!x) { closeSide(); return; }
            topic = x.name;
            var t2 = h('h3', 'cr-d-title', x.name); t2.id = 'crSideTitle'; b.appendChild(t2);
            if (x.simple) b.appendChild(h('p', 'cr-d-simple', x.simple));
            b.appendChild(h('p', 'cr-d-body', x.body));
            var chips = h('div', 'cr-d-chips');
            chips.appendChild(h('span', 'cr-d-chip cr-d-chip--freq', x.frequency));
            chips.appendChild(h('span', 'cr-d-chip cr-d-chip--month', x.month));
            if (x.mode) chips.appendChild(h('span', 'cr-d-chip cr-d-chip--mode', x.mode));
            b.appendChild(chips);
            if (x.rows && x.rows.length) {
                var table = h('table', 'cr-table'), thead = h('thead'), hr = h('tr');
                ['Section', 'Questions', 'Marks'].forEach(function (s) { hr.appendChild(h('th', '', s)); });
                thead.appendChild(hr); table.appendChild(thead);
                var tbody = h('tbody');
                x.rows.forEach(function (r) { var tr = h('tr'); r.forEach(function (c) { tr.appendChild(h('td', '', c)); }); tbody.appendChild(tr); });
                table.appendChild(tbody); b.appendChild(table);
            } else if (x.pattern) {
                b.appendChild(h('div', 'cr-d-label', 'Pattern')); b.appendChild(h('p', 'cr-d-text', x.pattern));
            }
            if (x.total) b.appendChild(h('p', 'cr-d-text', x.total));
            if (x.marking) { b.appendChild(h('div', 'cr-d-label', 'Marking')); b.appendChild(h('p', 'cr-d-text', x.marking)); }
            if (x.eligibility) { b.appendChild(h('div', 'cr-d-label', 'Who can apply')); b.appendChild(h('p', 'cr-d-text', x.eligibility)); }
            if (x.leads) { b.appendChild(h('div', 'cr-d-label', 'Leads to')); b.appendChild(h('p', 'cr-d-text', x.leads)); }
            if (x.official) {
                var lp = h('p', 'cr-d-text'); lp.style.marginTop = '12px';
                var link = h('a', 'cr-d-link', 'Official website');
                link.href = x.official; link.target = '_blank'; link.rel = 'noopener noreferrer';
                lp.appendChild(link); b.appendChild(lp);
            }
        }

        var actions = h('div', 'cr-d-actions');
        var ask = h('a', 'btn btn-primary', isCareer ? 'Talk to a counsellor' : 'Ask about ' + x.name.split(' (')[0]);
        ask.href = talkUrl(topic);
        actions.appendChild(ask);
        var dlb = h('button', 'btn btn-secondary', 'Download my roadmap (PDF)'); dlb.type = 'button';
        dlb.addEventListener('click', downloadRoadmap);
        actions.appendChild(dlb);
        var wab = h('a', 'btn cr-wa', 'WhatsApp our expert'); wab.href = waUrl(); wab.target = '_blank'; wab.rel = 'noopener noreferrer';
        actions.appendChild(wab);
        b.appendChild(actions);
        b.appendChild(h('p', 'cr-d-note', 'Details are for the ' + state.index.updated + '. Cut-offs, past-year criteria and dates are approximate and may not be exact. They change every year, so confirm on the official website.'));

        el.side.hidden = false; el.split.classList.add('has-side');
        if (small()) {
            el.backdrop.hidden = false;
            setTimeout(function () { el.backdrop.classList.add('is-open'); el.close.focus(); }, 20);
        }
        el.side.scrollTop = 0;
        document.addEventListener('keydown', onKey);
    }
    function closeSide() {
        if (el.side.hidden) return;
        el.side.hidden = true; el.split.classList.remove('has-side');
        el.backdrop.classList.remove('is-open'); el.backdrop.hidden = true;
        document.removeEventListener('keydown', onKey);
        state.side = null;
    }
    function onKey(e) { if (e.key === 'Escape') closeSide(); }
    el.close.addEventListener('click', closeSide);
    el.backdrop.addEventListener('click', closeSide);

    /* ---------- open a whole route (search, shared link) ---------- */
    // pick the group of this pathway whose first bubbles can reach the target (a pathway can have several groups)
    function findGroup(d, pathId, nodeId) {
        var best = null, reach = null;
        var up = walk(d.inn, nodeId);
        state.index.doors.forEach(function (door) {
            (door.groups || []).forEach(function (g) {
                if (g.pathway !== pathId) return;
                var ids = entryIds(d, g).ids, ok = ids.some(function (id) { return up[id]; });
                if (!best) best = { door: door, group: g };
                if (ok && !reach) reach = { door: door, group: g };
            });
        });
        return reach || best;
    }
    function openTarget(pathId, nodeId) {
        return loadPath(pathId).then(function (d) {
            var node = d.byId[nodeId], fg = findGroup(d, pathId, nodeId);
            if (!node || !fg) return false;
            var e = entryIds(d, fg.group), parents = [], seen = {};
            // walk back from the target to one of the first bubbles
            (function back(id, trail) {
                if (parents.length) return;
                if (e.ids.indexOf(id) > -1) { parents = [id].concat(trail); return; }
                (d.inn[id] || []).forEach(function (p) { if (!seen[p + '>' + id]) { seen[p + '>' + id] = 1; back(p, [id].concat(trail)); } });
            }(nodeId, []));
            if (!parents.length) return false;
            var dRef = doorRef(fg.door), chain = [dRef];
            if (!(fg.door.groups.length === 1)) chain.push(groupRef(fg.door, fg.group));
            parents.forEach(function (id) { chain.push(nodeRef(d, d.byId[id], fg.door, fg.group)); });
            var hi = {}; var anc = walk(d.inn, nodeId);
            Object.keys(anc).forEach(function (id) { hi['n:' + d.id + ':' + id] = 1; });
            return chain.reduce(function (p, ref) { return p.then(function () { return kidsOf(ref); }); }, Promise.resolve()).then(function () {
                state.chain = chain; state.hi = hi;
                var last = chain[chain.length - 1];
                var panel = last.type === 'exam' || last.type === 'career';
                render(true);
                if (panel) showSide(last); else closeSide();
                setTip(panel ? '' : last.note || '');
                return true;
            });
        });
    }

    /* ---------- search: instant suggestions over one small file ---------- */
    function goExplorer() { el.explorer.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
    function norm(s) { return String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
    function prepCareers(c) {
        return c.items.map(function (r) {
            var kws = r[5] ? r[5].split('|') : [];
            var ln = norm(r[0]);
            return { label: r[0], type: r[1], path: r[2], node: r[3], field: r[4], ln: ln, words: ln.split(' '), kw: kws.map(norm), id: r[2] + '/' + r[3] };
        });
    }
    function near(a, b) { // true when two words differ by one letter, one gap or one swap
        if (Math.abs(a.length - b.length) > 1) return false;
        var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
        if (a.length === b.length) { return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)); }
        return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
    }
    function scoreItem(it, q, toks) {
        var s = 0, w, k, j;
        if (it.ln === q) s = 1000;
        else if (it.ln.indexOf(q) === 0) s = 800 - (it.ln.length - q.length);
        else {
            for (j = 0; j < it.words.length; j++) if (it.words[j].indexOf(q) === 0) { s = Math.max(s, 640 - j * 10); break; }
            if (!s && q.length >= 3 && it.ln.indexOf(q) > -1) s = 450;
        }
        for (k = 0; k < it.kw.length; k++) {
            w = it.kw[k];
            if (w === q) s = Math.max(s, 900);
            else if (w.indexOf(q) === 0) s = Math.max(s, 620);
            else if (q.length >= 3 && w.indexOf(q) > -1) s = Math.max(s, 380);
            else if (w.length >= 4 && (' ' + q + ' ').indexOf(' ' + w + ' ') > -1) s = Math.max(s, 330 + w.length);
            else if (w.length >= 5 && q.indexOf(w) > -1) s = Math.max(s, 300 + w.length);
        }
        if (!s && toks.length > 1) {
            var all = it.words.concat(it.kw.join(' ').split(' '));
            var hits = 0; toks.forEach(function (t) { if (all.some(function (x) { return x.indexOf(t) === 0; })) hits++; });
            if (hits === toks.length) s = 350; else if (hits) s = 120 * hits / toks.length + 60;
        }
        if (!s && q.length >= 5) {
            var pool = it.words.concat(it.kw);
            for (j = 0; j < pool.length; j++) if (pool[j].length >= 5 && near(q, pool[j])) { s = 200; break; }
        }
        if (!s) return 0;
        return s + (it.type === 'c' ? 20 : it.type === 'e' ? 10 : 0);
    }
    function searchCareers(raw, limit) {
        var q = norm(raw);
        if (!state.careers || q.length < 2) return [];
        var toks = q.split(' ').filter(function (t) { return t.length > 1; });
        var out = [];
        for (var i = 0; i < state.careers.length; i++) {
            var sc = scoreItem(state.careers[i], q, toks);
            if (sc) out.push({ it: state.careers[i], sc: sc });
        }
        out.sort(function (a, b) { return b.sc - a.sc || a.it.label.length - b.it.label.length; });
        return out.slice(0, limit || 8).map(function (x) { return x.it; });
    }

    var sug = { list: document.getElementById('crSuggest'), items: [], active: -1 };
    function closeSuggest() {
        if (!sug.list) return;
        sug.list.hidden = true; sug.list.textContent = ''; sug.items = []; sug.active = -1;
        el.query.setAttribute('aria-expanded', 'false'); el.query.removeAttribute('aria-activedescendant');
    }
    function setActive(i) {
        var lis = sug.list.children;
        if (!lis.length) return;
        sug.active = (i + lis.length) % lis.length;
        Array.prototype.forEach.call(lis, function (li, j) { li.classList.toggle('is-active', j === sug.active); li.setAttribute('aria-selected', j === sug.active ? 'true' : 'false'); });
        el.query.setAttribute('aria-activedescendant', lis[sug.active].id);
    }
    function showSuggest() {
        if (!sug.list) return;
        var res = searchCareers(el.query.value, 8);
        sug.list.textContent = ''; sug.items = res; sug.active = -1;
        if (!res.length) { closeSuggest(); return; }
        res.forEach(function (it, i) {
            var li = h('li', 'cr-sug-item'); li.id = 'crSug' + i; li.setAttribute('role', 'option');
            li.appendChild(h('span', 'cr-sug-label', it.label));
            li.appendChild(h('small', 'cr-sug-meta', (it.type === 'e' ? 'Exam, ' : it.type === 'k' ? 'Course, ' : '') + it.field));
            li.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus so the tap is not lost
            li.addEventListener('click', function () { chooseItem(it); });
            sug.list.appendChild(li);
        });
        sug.list.hidden = false; el.query.setAttribute('aria-expanded', 'true');
    }
    function chooseItem(it) {
        el.query.value = it.label; closeSuggest(); el.msg.textContent = '';
        openTarget(it.path, it.node).then(function (ok) {
            if (ok) { el.msg.textContent = 'Here is your whole route.'; goExplorer(); } else missMsg();
        });
    }
    function missMsg() {
        el.msg.textContent = '';
        el.msg.appendChild(document.createTextNode('We could not find that one. Try another word, browse the full list below, or '));
        var a = h('a', 'cr-d-link', 'ask a counsellor'); a.href = talkUrl(el.query.value);
        el.msg.appendChild(a); el.msg.appendChild(document.createTextNode('.'));
    }
    var sugTimer = 0;
    el.query.addEventListener('input', function () { clearTimeout(sugTimer); sugTimer = setTimeout(showSuggest, 60); });
    el.query.addEventListener('focus', function () { if (el.query.value.trim().length > 1) showSuggest(); });
    el.query.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (sug.list.hidden) showSuggest();
            if (sug.items.length) { e.preventDefault(); setActive(sug.active + (e.key === 'ArrowDown' ? 1 : -1)); }
        } else if (e.key === 'Escape') closeSuggest();
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.cr-search-box')) closeSuggest(); });
    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        el.msg.textContent = '';
        var raw = el.query.value;
        if (!raw.trim()) { el.msg.textContent = 'Type a job you like, for example doctor or pilot.'; return; }
        if (!state.careers) { el.msg.textContent = 'One moment, the list is still loading. Please try again.'; return; }
        var pick = sug.active >= 0 ? sug.items[sug.active] : searchCareers(raw, 1)[0];
        if (pick) chooseItem(pick); else { closeSuggest(); missMsg(); }
    });

    /* ---------- browse all careers, A to Z ---------- */
    function renderAll() {
        var list = document.getElementById('crAllList'), letters = document.getElementById('crLetters'), field = document.getElementById('crAllField'), filter = document.getElementById('crAllFilter'), count = document.getElementById('crAllCount');
        if (!list || !state.careers) return;
        var careers = state.careers.filter(function (c) { return c.type === 'c'; });
        var fields = {}; careers.forEach(function (c) { fields[c.field] = 1; });
        Object.keys(fields).sort().forEach(function (f) { var o = h('option', '', f); o.value = f; field.appendChild(o); });
        function draw() {
            var f = field.value, q = norm(filter.value);
            list.textContent = ''; letters.textContent = '';
            var shown = careers.filter(function (c) { return (!f || c.field === f) && (!q || c.ln.indexOf(q) > -1 || c.kw.some(function (k) { return k.indexOf(q) > -1; })); });
            var by = {};
            shown.forEach(function (c) { var L = c.label.charAt(0).toUpperCase(); (by[L] = by[L] || []).push(c); });
            Object.keys(by).sort().forEach(function (L) {
                var a = h('a', 'cr-letter', L); a.href = '#cr-l-' + L;
                a.addEventListener('click', function (e) { e.preventDefault(); var t = document.getElementById('cr-l-' + L); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
                letters.appendChild(a);
                var sec = h('div', 'cr-all-group'); sec.id = 'cr-l-' + L;
                sec.appendChild(h('h3', 'cr-all-h', L));
                var wrap = h('div', 'cr-all-items');
                by[L].forEach(function (c) {
                    var b = h('button', 'cr-all-item'); b.type = 'button';
                    b.appendChild(h('span', 'cr-all-name', c.label)); b.appendChild(h('small', 'cr-all-field', c.field));
                    b.addEventListener('click', function () { chooseItem(c); });
                    wrap.appendChild(b);
                });
                sec.appendChild(wrap); list.appendChild(sec);
            });
            count.textContent = shown.length ? shown.length + ' careers' + (f || q ? ' shown' : ' in all') : 'No career matches. Try another word, or ask a counsellor.';
        }
        field.addEventListener('change', draw);
        var ft = 0; filter.addEventListener('input', function () { clearTimeout(ft); ft = setTimeout(draw, 80); });
        draw();
    }

    /* ---------- class buttons ---------- */
    el.chips.addEventListener('click', function (e) {
        var b = e.target.closest('.cr-chip'); if (!b) return;
        var tag = b.getAttribute('data-tag'), cs = state.index.classStarts[tag];
        if (cs) {
            var door = doorById(cs.door), g = door.groups.filter(function (x) { return x.id === cs.group; })[0];
            var dRef = doorRef(door), gRef = groupRef(door, g);
            kidsOf(dRef).then(function () { return kidsOf(gRef); }).then(function () {
                state.chain = [dRef, gRef]; state.hi = null; render(true); closeSide(); setTip(''); goExplorer();
            });
        } else if (tag === 'a10') {
            startOver('After Class 10 you choose a stream. Pick one below.', true);
        } else if (tag === 'a12') {
            startOver('After Class 12 you can pick a stream or a field like Law, Defence or Design. Pick one below.', true);
        }
    });

    /* ---------- calendar and downloads ---------- */
    function renderCalendar(cal) {
        var months = document.getElementById('crMonths'), list = document.getElementById('crCalList'), note = document.getElementById('crCalNote');
        if (!months || !list) return;
        note.textContent = cal.note || '';
        var now = new Date().getMonth();
        function show(i) {
            Array.prototype.forEach.call(months.children, function (b, j) { b.classList.toggle('is-on', i === j); b.setAttribute('aria-selected', i === j ? 'true' : 'false'); });
            list.textContent = '';
            cal.months[i].items.forEach(function (it) {
                var b = h('button', 'cr-cal-item', it.label); b.type = 'button';
                b.addEventListener('click', function () {
                    openTarget(it.path, it.node).then(function (ok) { if (ok) goExplorer(); });
                });
                list.appendChild(b);
            });
            if (!cal.months[i].items.length) list.appendChild(h('p', 'cr-cal-empty', 'No big exams this month.'));
        }
        cal.months.forEach(function (m, i) {
            var b = h('button', 'cr-month', m.month.slice(0, 3)); b.type = 'button'; b.setAttribute('role', 'tab'); b.title = m.month;
            b.addEventListener('click', function () { show(i); });
            months.appendChild(b);
        });
        show(now);
    }
    function renderDownloads(list) {
        var grid = document.getElementById('crDlGrid');
        if (!grid || !list) return;
        list.forEach(function (g) {
            var a = h('a', 'cr-dl-card' + (g.main ? ' cr-dl-card--main' : '')); a.href = g.href; a.setAttribute('download', '');
            a.appendChild(h('i', 'fa-solid fa-file-pdf'));
            var t = h('span', 'cr-dl-text'); t.appendChild(h('strong', '', g.title)); t.appendChild(h('small', '', g.blurb)); a.appendChild(t);
            a.appendChild(h('span', 'cr-dl-go', 'PDF'));
            grid.appendChild(a);
        });
    }

    /* ---------- start ---------- */
    Promise.all([getJSON(BASE + 'index.json'), getJSON(BASE + 'exams.json')]).then(function (r) {
        state.index = r[0]; state.exams = r[1];
        getJSON(BASE + 'careers.json').then(function (c) {
            state.careers = prepCareers(c); renderAll();
            if (document.activeElement === el.query && el.query.value.trim().length > 1) showSuggest();
        }).catch(function () {});
        renderDownloads(state.index.downloads);
        getJSON(BASE + 'calendar.json').then(renderCalendar).catch(function () {});
        var q = new URLSearchParams(location.search), path = q.get('path'), node = q.get('node');
        render(false);
        if (path && node && pathMeta(path)) {
            openTarget(path, node).then(function (ok) {
                if (!ok) return;
                var go = function () { window.scrollTo(0, el.explorer.getBoundingClientRect().top + window.pageYOffset - 70); };
                if (document.readyState === 'complete') setTimeout(go, 300);
                else window.addEventListener('load', function () { setTimeout(go, 300); setTimeout(go, 900); }, { once: true });
            });
        }
    }).catch(function () {
        mapEl.textContent = '';
        var p = h('p', 'cr-noscript', 'The map could not load. Please open this page through the website, or ');
        var a = h('a', 'cr-d-link', 'contact LessonPlan'); a.href = 'contact.html';
        p.appendChild(a); p.appendChild(document.createTextNode('.'));
        mapEl.appendChild(p);
    });
}());
