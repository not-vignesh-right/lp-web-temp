/* Career Roadmap page: pathway picker, all-routes map, single-route view, exam drawer, search. */
(function () {
    'use strict';

    var BASE = 'data/career/';
    var cardsEl = document.getElementById('crCards');
    if (!cardsEl) return;

    var el = {
        explorer: document.getElementById('explorer'),
        title: document.getElementById('crTitle'),
        intro: document.getElementById('crIntro'),
        hint: document.getElementById('crHint'),
        stage: document.getElementById('crStage'),
        back: document.getElementById('crBack'),
        form: document.getElementById('crSearch'),
        query: document.getElementById('crQuery'),
        msg: document.getElementById('crSearchMsg'),
        chips: document.getElementById('crChips'),
        drawer: document.getElementById('crDrawer'),
        drawerBody: document.getElementById('crDrawerBody'),
        backdrop: document.getElementById('crBackdrop'),
        close: document.getElementById('crClose')
    };

    var TYPE_LABEL = { stage: 'stage', exam: 'entrance exam', course: 'degree or course', career: 'career' };
    var state = { index: null, exams: null, cache: {}, path: null, focus: null, opener: null };
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- helpers ---------- */
    function h(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    function getJSON(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
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
            var x = stack.pop();
            (map[x] || []).forEach(function (y) { if (!seen[y]) { seen[y] = 1; stack.push(y); } });
        }
        return seen;
    }
    function related(d, id) {
        var a = walk(d.inn, id), b = walk(d.out, id);
        for (var k in b) a[k] = 1;
        return a;
    }
    function pathMeta(id) {
        for (var i = 0; i < state.index.pathways.length; i++) {
            if (state.index.pathways[i].id === id) return state.index.pathways[i];
        }
        return null;
    }
    function loadPath(meta) {
        if (state.cache[meta.id]) return Promise.resolve(state.cache[meta.id]);
        return getJSON(BASE + meta.file).then(function (d) {
            state.cache[meta.id] = prepare(d);
            return state.cache[meta.id];
        });
    }
    function setHash(path, focus) {
        var q = '?path=' + encodeURIComponent(path) + (focus ? '&node=' + encodeURIComponent(focus) : '');
        if (location.search !== q) history.replaceState(null, '', location.pathname + q);
    }

    /* ---------- pathway picker ---------- */
    function renderCards() {
        cardsEl.textContent = '';
        state.index.pathways.forEach(function (p) {
            var card = p.live ? h('button', 'cr-card') : h('div', 'cr-card is-soon');
            card.setAttribute('data-id', p.id);
            card.setAttribute('data-tags', (p.tags || []).join(' '));
            var icon = h('span', 'cr-card-icon');
            icon.setAttribute('aria-hidden', 'true');
            icon.appendChild(h('i', 'fa-solid ' + p.icon));
            card.appendChild(icon);
            card.appendChild(h('h3', '', p.title));
            card.appendChild(h('p', '', p.blurb));
            if (p.live) {
                card.type = 'button';
                card.appendChild(h('span', 'cr-card-go', 'Open the map'));
                card.addEventListener('click', function () { openPath(p.id, null, true); });
            } else {
                card.setAttribute('aria-disabled', 'true');
                card.appendChild(h('span', 'cr-card-soon', 'Guide in preparation'));
            }
            cardsEl.appendChild(card);
        });
    }
    function markActiveCard() {
        Array.prototype.forEach.call(cardsEl.children, function (c) {
            c.classList.toggle('is-active', c.getAttribute('data-id') === state.path);
        });
    }
    el.chips.addEventListener('click', function (e) {
        var b = e.target.closest('.cr-chip');
        if (!b) return;
        var on = b.getAttribute('aria-pressed') === 'true';
        Array.prototype.forEach.call(el.chips.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        var tag = on ? null : b.getAttribute('data-tag');
        if (!on) b.setAttribute('aria-pressed', 'true');
        Array.prototype.forEach.call(cardsEl.children, function (c) {
            var tags = (c.getAttribute('data-tags') || '').split(' ');
            c.classList.toggle('is-dim', !!tag && tags.indexOf(tag) === -1);
        });
        document.getElementById('pathways').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });

    /* ---------- open a pathway ---------- */
    function scrollToExplorer() {
        el.explorer.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
    function openPath(id, focus, userAction) {
        var meta = pathMeta(id);
        if (!meta || !meta.live) return Promise.resolve();
        el.explorer.hidden = false;
        el.stage.textContent = '';
        el.stage.appendChild(h('p', 'cr-intro', 'Loading the map...'));
        return loadPath(meta).then(function (d) {
            state.path = id;
            markActiveCard();
            el.title.textContent = d.title + ': Class 10 to career';
            el.intro.textContent = d.intro;
            var n = focus && d.byId[focus];
            if (n && n.type === 'exam') { renderMap(d); openExam(n, null); }
            else if (n && n.type !== 'stage') { showRoute(d, n.id); }
            else { renderMap(d); }
            if (userAction) { scrollToExplorer(); }
        }).catch(function () {
            el.stage.textContent = '';
            var p = h('p', 'cr-intro', 'The map could not load. Please check your connection and try again, or ');
            var a = h('a', 'cr-d-link', 'talk to LessonPlan');
            a.href = 'contact.html?topic=Career+guidance&from=career-roadmap';
            p.appendChild(a); p.appendChild(document.createTextNode('.'));
            el.stage.appendChild(p);
        });
    }

    /* ---------- all routes map ---------- */
    function makeNode(d, n) {
        var b = h('button', 'cr-node cr-node--' + n.type, n.label);
        b.type = 'button';
        b.setAttribute('data-id', n.id);
        b.setAttribute('aria-label', n.label + ', ' + TYPE_LABEL[n.type]);
        if (n.note) b.title = n.note;
        b.addEventListener('click', function () {
            if (n.type === 'exam') { openExam(n, b); }
            else if (n.type === 'stage') { el.hint.textContent = n.note || ''; }
            else { showRoute(d, n.id); }
        });
        return b;
    }
    function renderMap(d) {
        state.focus = null;
        setHash(d.id, null);
        el.back.hidden = true;
        el.hint.textContent = 'Tap a career to see its single route. Tap an orange exam for its details.';
        var scroll = h('div', 'cr-scroll');
        var map = h('div', 'cr-map');
        map.style.setProperty('--cols', d.lanes.length);
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'cr-links');
        svg.setAttribute('aria-hidden', 'true');
        map.appendChild(svg);
        d.lanes.forEach(function (lane) {
            var col = h('div', 'cr-lane');
            col.appendChild(h('div', 'cr-lane-label', lane.label));
            var box = h('div', 'cr-lane-nodes');
            d.nodes.filter(function (n) { return n.lane === lane.id; }).forEach(function (n) { box.appendChild(makeNode(d, n)); });
            col.appendChild(box);
            map.appendChild(col);
        });
        scroll.appendChild(map);
        el.stage.textContent = '';
        el.stage.appendChild(scroll);
        var draw = function () { drawLinks(d, map, svg); };
        requestAnimationFrame(draw);
        if (window.ResizeObserver) new ResizeObserver(draw).observe(map);
        else window.addEventListener('resize', draw);
        bindHover(d, map, svg);
    }
    function drawLinks(d, map, svg) {
        var r = map.getBoundingClientRect();
        svg.textContent = '';
        if (!r.width || getComputedStyle(svg).display === 'none') return;
        d.edges.forEach(function (e) {
            var a = map.querySelector('.cr-node[data-id="' + e[0] + '"]');
            var b = map.querySelector('.cr-node[data-id="' + e[1] + '"]');
            if (!a || !b) return;
            var A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
            var x1 = A.right - r.left, y1 = A.top + A.height / 2 - r.top;
            var x2 = B.left - r.left, y2 = B.top + B.height / 2 - r.top, mx = (x1 + x2) / 2;
            var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2);
            p.setAttribute('data-from', e[0]); p.setAttribute('data-to', e[1]);
            svg.appendChild(p);
        });
    }
    function bindHover(d, map, svg) {
        function on(id) {
            var rel = related(d, id);
            Array.prototype.forEach.call(svg.children, function (p) {
                var hit = rel[p.getAttribute('data-from')] && rel[p.getAttribute('data-to')];
                p.classList.toggle('is-on', !!hit); p.classList.toggle('is-dim', !hit);
            });
            Array.prototype.forEach.call(map.querySelectorAll('.cr-node'), function (n) {
                n.classList.toggle('is-dim', !rel[n.getAttribute('data-id')]);
            });
        }
        function off() {
            Array.prototype.forEach.call(svg.children, function (p) { p.classList.remove('is-on', 'is-dim'); });
            Array.prototype.forEach.call(map.querySelectorAll('.cr-node'), function (n) { n.classList.remove('is-dim'); });
        }
        Array.prototype.forEach.call(map.querySelectorAll('.cr-node'), function (n) {
            var id = n.getAttribute('data-id');
            n.addEventListener('mouseenter', function () { on(id); });
            n.addEventListener('focus', function () { on(id); });
            n.addEventListener('mouseleave', off);
            n.addEventListener('blur', off);
        });
    }

    /* ---------- one route ---------- */
    function showRoute(d, id) {
        var focus = d.byId[id];
        state.focus = id;
        setHash(d.id, id);
        var set = related(d, id);
        el.back.hidden = false;
        el.hint.textContent = focus.type === 'career'
            ? 'Your route to ' + focus.label + '. Tap an orange exam for its details.'
            : 'Routes through ' + focus.label + '. Tap an orange exam for its details.';
        var lanes = d.lanes.filter(function (l) {
            return d.nodes.some(function (n) { return n.lane === l.id && set[n.id]; });
        });
        var route = h('div', 'cr-route');
        route.style.setProperty('--cols', lanes.length);
        lanes.forEach(function (lane, i) {
            var stop = h('div', 'cr-stop');
            stop.style.setProperty('--i', i);
            stop.appendChild(h('div', 'cr-stop-num', String(i + 1)));
            stop.appendChild(h('div', 'cr-stop-label', lane.label));
            var body = h('div', 'cr-stop-body');
            var items = d.nodes.filter(function (n) { return n.lane === lane.id && set[n.id]; });
            items.forEach(function (n, j) {
                if (j) body.appendChild(h('div', 'cr-or', 'or'));
                var pill = makeNode(d, n);
                pill.classList.toggle('is-focus', n.id === id);
                body.appendChild(pill);
                if (n.note) body.appendChild(h('p', 'cr-note', n.note));
            });
            stop.appendChild(body);
            route.appendChild(stop);
        });
        var scroll = h('div', 'cr-scroll');
        scroll.appendChild(route);
        el.stage.textContent = '';
        el.stage.appendChild(scroll);
    }
    el.back.addEventListener('click', function () {
        var d = state.cache[state.path];
        if (d) renderMap(d);
    });

    /* ---------- exam drawer ---------- */
    function openExam(node, opener) {
        var x = state.exams[node.exam];
        if (!x) return;
        var meta = pathMeta(state.path);
        state.opener = opener || null;
        var b = el.drawerBody;
        b.textContent = '';
        var title = h('h3', 'cr-d-title', x.name);
        title.id = 'crDrawerTitle';
        b.appendChild(title);
        b.appendChild(h('p', 'cr-d-body', x.body));
        var chips = h('div', 'cr-d-chips');
        chips.appendChild(h('span', 'cr-d-chip cr-d-chip--freq', x.frequency));
        chips.appendChild(h('span', 'cr-d-chip cr-d-chip--month', x.month));
        if (x.mode) chips.appendChild(h('span', 'cr-d-chip cr-d-chip--mode', x.mode));
        b.appendChild(chips);

        var table = h('table', 'cr-table');
        var head = h('tr');
        ['Section', 'Questions', 'Marks'].forEach(function (t) { head.appendChild(h('th', '', t)); });
        var thead = h('thead'); thead.appendChild(head); table.appendChild(thead);
        var tbody = h('tbody');
        x.rows.forEach(function (r) {
            var tr = h('tr');
            r.forEach(function (c) { tr.appendChild(h('td', '', c)); });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        b.appendChild(table);
        if (x.total) b.appendChild(h('p', 'cr-d-text', x.total));

        b.appendChild(h('div', 'cr-d-label', 'Marking'));
        b.appendChild(h('p', 'cr-d-text', x.marking));
        b.appendChild(h('div', 'cr-d-label', 'Who can apply'));
        b.appendChild(h('p', 'cr-d-text', x.eligibility));
        if (x.leads) {
            b.appendChild(h('div', 'cr-d-label', 'Leads to'));
            b.appendChild(h('p', 'cr-d-text', x.leads));
        }
        if (x.official) {
            var lp = h('p', 'cr-d-text');
            var link = h('a', 'cr-d-link', 'Official website');
            link.href = x.official; link.target = '_blank'; link.rel = 'noopener noreferrer';
            lp.appendChild(link);
            lp.style.marginTop = '12px';
            b.appendChild(lp);
        }

        var actions = h('div', 'cr-d-actions');
        var ask = h('a', 'btn btn-primary', 'Ask about ' + x.name.split(' (')[0]);
        ask.href = 'contact.html?topic=' + encodeURIComponent(x.name) +
            '&path=' + encodeURIComponent(meta ? meta.title : '') + '&from=career-roadmap';
        actions.appendChild(ask);
        if (meta && meta.guide) {
            var dl = h('a', 'btn btn-secondary', 'Download guide (PDF)');
            dl.href = meta.guide; dl.setAttribute('download', '');
            actions.appendChild(dl);
        } else {
            var off = h('span', 'btn btn-secondary cr-btn-off', 'Guide download soon');
            off.setAttribute('aria-disabled', 'true');
            actions.appendChild(off);
        }
        b.appendChild(actions);
        b.appendChild(h('p', 'cr-d-note', 'Details are for the ' + state.index.updated + '. Dates and rules change every year, so confirm on the official website.'));

        el.drawer.hidden = false; el.backdrop.hidden = false;
        requestAnimationFrame(function () {
            el.drawer.classList.add('is-open'); el.backdrop.classList.add('is-open');
            el.close.focus();
        });
        document.addEventListener('keydown', onKey);
    }
    function closeDrawer() {
        el.drawer.classList.remove('is-open'); el.backdrop.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(function () { el.drawer.hidden = true; el.backdrop.hidden = true; }, reduced ? 0 : 280);
        if (state.opener && document.contains(state.opener)) state.opener.focus();
    }
    function onKey(e) {
        if (e.key === 'Escape') { closeDrawer(); return; }
        if (e.key !== 'Tab') return;
        var f = el.drawer.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    el.close.addEventListener('click', closeDrawer);
    el.backdrop.addEventListener('click', closeDrawer);

    /* ---------- search ---------- */
    function hit(q, k) {
        if (k.length <= 3) return (' ' + q.replace(/[^a-z0-9 ]/g, ' ') + ' ').indexOf(' ' + k + ' ') > -1;
        return q.indexOf(k) > -1 || (q.length >= 4 && k.indexOf(q) > -1);
    }
    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = el.query.value.toLowerCase().trim();
        el.msg.textContent = '';
        if (!q) { el.msg.textContent = 'Type a career, for example doctor or engineer.'; return; }
        var found = null;
        state.index.search.some(function (s) {
            return s.k.some(function (k) { if (hit(q, k)) { found = s; return true; } return false; });
        });
        if (found) {
            var meta = pathMeta(found.path);
            el.msg.textContent = 'Showing the route in ' + meta.title + '.';
            openPath(found.path, found.node, true);
        } else {
            el.msg.appendChild(document.createTextNode('We do not have that yet. Try doctor, engineer, architect, CA or lawyer, or '));
            var a = h('a', 'cr-d-link', 'talk to a counsellor');
            a.href = 'contact.html?topic=' + encodeURIComponent(el.query.value) + '&from=career-roadmap';
            el.msg.appendChild(a); el.msg.appendChild(document.createTextNode('.'));
        }
    });

    /* ---------- start ---------- */
    function linkTarget() {
        var q = new URLSearchParams(location.search);
        var path = q.get('path'), node = q.get('node');
        if (!path && location.hash) { var m = location.hash.replace('#', '').split('/'); path = m[0]; node = m[1]; }
        var p = path && pathMeta(path);
        return (p && p.live) ? { path: path, node: node || null } : null;
    }
    function firstLoadFromLink() {
        var t = linkTarget();
        if (!t) return;
        openPath(t.path, t.node, false).then(function () {
            var go = function () {
                var top = el.explorer.getBoundingClientRect().top + window.pageYOffset - 70;
                window.scrollTo(0, top);
            };
            if (document.readyState === 'complete') { setTimeout(go, 300); }
            else { window.addEventListener('load', function () { setTimeout(go, 300); setTimeout(go, 900); }, { once: true }); }
        });
    }    Promise.all([getJSON(BASE + 'index.json'), getJSON(BASE + 'exams.json')]).then(function (r) {
        state.index = r[0]; state.exams = r[1];
        renderCards();
        firstLoadFromLink();
    }).catch(function () {
        cardsEl.textContent = '';
        var p = h('p', 'cr-noscript', 'The pathways could not load. Please open this page through the website, or ');
        var a = h('a', 'cr-d-link', 'contact LessonPlan');
        a.href = 'contact.html'; p.appendChild(a); p.appendChild(document.createTextNode('.'));
        cardsEl.appendChild(p);
    });
}());
