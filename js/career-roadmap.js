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
    var TITLES = { door: 'Pick a stream', group: 'Pick your subjects', stage: 'Next step', exam: 'How do you get in?', course: 'What will you study?', career: 'What can you become?', next: 'What next?' };
    var state = { index: null, exams: null, cache: {}, chain: [], hi: null, side: null, cols: 0 };
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
            setTip('This guide is coming soon. Ask a counsellor and we will help you right away.', 'Talk to us', 'contact.html?topic=' + encodeURIComponent(ref.label) + '&from=career-roadmap');
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
            var table = h('table', 'cr-table'), thead = h('thead'), hr = h('tr');
            ['Section', 'Questions', 'Marks'].forEach(function (s) { hr.appendChild(h('th', '', s)); });
            thead.appendChild(hr); table.appendChild(thead);
            var tbody = h('tbody');
            x.rows.forEach(function (r) { var tr = h('tr'); r.forEach(function (c) { tr.appendChild(h('td', '', c)); }); tbody.appendChild(tr); });
            table.appendChild(tbody); b.appendChild(table);
            if (x.total) b.appendChild(h('p', 'cr-d-text', x.total));
            b.appendChild(h('div', 'cr-d-label', 'Marking')); b.appendChild(h('p', 'cr-d-text', x.marking));
            b.appendChild(h('div', 'cr-d-label', 'Who can apply')); b.appendChild(h('p', 'cr-d-text', x.eligibility));
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
        ask.href = 'contact.html?topic=' + encodeURIComponent(topic) + '&path=' + encodeURIComponent(pathTitle) + '&from=career-roadmap';
        actions.appendChild(ask);
        var meta = pathMeta(ref.pathId);
        if (meta && meta.guide) {
            var dl = h('a', 'btn btn-secondary', 'Download guide (PDF)'); dl.href = meta.guide; dl.setAttribute('download', '');
            actions.appendChild(dl);
        } else {
            var off = h('span', 'btn btn-secondary cr-btn-off', 'Guide download soon'); off.setAttribute('aria-disabled', 'true');
            actions.appendChild(off);
        }
        b.appendChild(actions);
        b.appendChild(h('p', 'cr-d-note', 'Details are for the ' + state.index.updated + '. Dates and rules change every year, so confirm on the official website.'));

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
    function findGroup(pathId, nodeId) {
        var best = null;
        state.index.doors.forEach(function (door) {
            (door.groups || []).forEach(function (g) {
                if (g.pathway !== pathId) return;
                if (!best || (g.entry && g.entry.indexOf(nodeId) > -1)) best = { door: door, group: g };
            });
        });
        return best;
    }
    function openTarget(pathId, nodeId) {
        return loadPath(pathId).then(function (d) {
            var node = d.byId[nodeId], fg = findGroup(pathId, nodeId);
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

    /* ---------- search and class buttons ---------- */
    function hit(q, k) {
        if (k.length <= 3) return (' ' + q.replace(/[^a-z0-9 ]/g, ' ') + ' ').indexOf(' ' + k + ' ') > -1;
        return q.indexOf(k) > -1 || (q.length >= 4 && k.indexOf(q) > -1);
    }
    function goExplorer() { el.explorer.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = el.query.value.toLowerCase().trim();
        el.msg.textContent = '';
        if (!q) { el.msg.textContent = 'Type a job you like, for example doctor or engineer.'; return; }
        var found = null;
        state.index.search.some(function (s) { return s.k.some(function (k) { if (hit(q, k)) { found = s; return true; } return false; }); });
        if (!found) {
            el.msg.appendChild(document.createTextNode('We do not have that one yet. Try doctor, engineer, architect, CA or lawyer, or '));
            var a = h('a', 'cr-d-link', 'ask a counsellor'); a.href = 'contact.html?topic=' + encodeURIComponent(el.query.value) + '&from=career-roadmap';
            el.msg.appendChild(a); el.msg.appendChild(document.createTextNode('.'));
            return;
        }
        openTarget(found.path, found.node).then(function (ok) {
            if (ok) { el.msg.textContent = 'Here is your whole route.'; goExplorer(); }
        });
    });
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
            startOver('After Class 12 you can pick a stream or a field like Law, Defence or Design. Some are coming soon.', true);
        }
    });

    /* ---------- start ---------- */
    Promise.all([getJSON(BASE + 'index.json'), getJSON(BASE + 'exams.json')]).then(function (r) {
        state.index = r[0]; state.exams = r[1];
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
