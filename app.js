// HR Quiz PRO - Modern State & Analytics Architecture

const state = {
    questions: [],
    activeTab: 'home', // 'home' | 'stats' | 'quiz' | 'result'
    modeTitle: '',
    indices: [],
    answers: [],
    currentIdx: 0,
    startTime: 0,
    timerInt: null,
    limit: 0,
    isFeedbackMode: true,
    runKey: '',
    charts: {} // Active Chart instances
};

// LocalStorage Database Manager
const DB = {
    getHistory: () => {
        try { return JSON.parse(localStorage.getItem('hrq_history_v2') || '[]'); }
        catch(e) { return []; }
    },
    addHistory: (record) => {
        try {
            const hist = DB.getHistory();
            hist.unshift(record); // Newest first
            if(hist.length > 50) hist.pop();
            localStorage.setItem('hrq_history_v2', JSON.stringify(hist));
        } catch(e) {}
    },
    clearHistory: () => {
        localStorage.removeItem('hrq_history_v2');
        localStorage.removeItem('hrq_blocks_v2');
    },
    getBestBlocks: () => {
        try { return JSON.parse(localStorage.getItem('hrq_blocks_v2') || '{}'); }
        catch(e) { return {}; }
    },
    setBestBlock: (blockIdx, percent) => {
        try {
            const b = DB.getBestBlocks();
            b[blockIdx] = Math.max(b[blockIdx] || 0, percent);
            localStorage.setItem('hrq_blocks_v2', JSON.stringify(b));
        } catch(e) {}
    }
};

// DOM Helpers
const el = (id) => document.getElementById(id);
const formatTime = (sec) => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const escapeHTML = (str) => str.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const L = ['A', 'B', 'C', 'D'];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    state.questions = window.Q || [];
    initBackgroundCanvas();
    initTabNavigation();
    runBootSequence();
});

// Tab Navigation Manager
function initTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            const target = tab.dataset.target;
            switchTab(target);
        };
    });

    el('brand-logo').onclick = () => switchTab('home');
}

function switchTab(targetTab) {
    state.activeTab = targetTab;
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.target === targetTab);
    });

    document.querySelectorAll('.view').forEach(v => v.classList.add('hide'));
    
    if (targetTab === 'home') {
        renderHome();
    } else if (targetTab === 'stats') {
        renderStatsPage();
    }
}

// Terminal Boot Animation
async function runBootSequence() {
    const boot = el('boot');
    const tb = el('tb');
    let skipped = false;
    
    boot.onclick = () => { skipped = true; endBoot(); };
    document.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !boot.classList.contains('out')) { skipped = true; endBoot(); }
    });

    const lines = [
        `[<span class="t-ok">  OK  </span>] Arch Linux 6.10.4-arch1-1 x86_64 initialized.`,
        `[<span class="t-ok">  OK  </span>] Hyprland Compositor running on Wayland.`,
        `[<span class="t-info"> INFO </span>] Mounting HR Knowledge Base v2.5...`,
        `[<span class="t-ok">  OK  </span>] Loaded ${state.questions.length} questions successfully.`,
        `[<span class="t-info"> INFO </span>] Initializing Chart.js & Analytics Engine...`,
        `<div class="t-sys">
  _  _ ___    ___  _   _ _____ ____  ____   ___  
 | || |  _ \  / _ \| | | |_   _|  _ \|  _ \ / _ \ 
 | || | |_) || | | | | | | | | | |_) | |_) | | | |
 |__   _|  _ < | |_| | |_| | | | |  __/|  _ <| |_| |
    |_| |_| \_\\__\_\\___/  |_| |_|   |_| \_\\___/ 
        </div>`,
        `<div class="t-logo">Professional Assessment & Analytics Environment</div>`,
        `System Host: salmon@hr-quiz-pro`,
        `Status: <span class="t-ok">ONLINE & READY</span>`,
    ];

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    for (let line of lines) {
        if (skipped) break;
        const div = document.createElement('div');
        div.innerHTML = line;
        tb.appendChild(div);
        await sleep(100);
    }
    
    if (!skipped) {
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        tb.appendChild(cursor);
        await sleep(900);
        endBoot();
    }

    function endBoot() {
        boot.classList.add('out');
        setTimeout(() => boot.remove(), 500);
        renderHome();
    }
}

// ---------------- 1. HOME VIEW ----------------
function renderHome() {
    clearInterval(state.timerInt);
    const history = DB.getHistory();
    const best = history.length ? Math.max(...history.map(x => x.percent)) : 0;
    const avg = history.length ? Math.round(history.reduce((a, b) => a + b.percent, 0) / history.length) : 0;

    // KPI Chips
    el('main-stats').innerHTML = `
        <div class="stat-card"><span class="val">${state.questions.length}</span><span class="lbl">Jami Savollar</span></div>
        <div class="stat-card"><span class="val">${Math.ceil(state.questions.length/30)}</span><span class="lbl">Bloklar</span></div>
        <div class="stat-card"><span class="val">${history.length}</span><span class="lbl">Urinishlar</span></div>
        <div class="stat-card"><span class="val">${history.length ? avg+'%' : '—'}</span><span class="lbl">O'rtacha Aniqlik</span></div>
    `;

    // Fix mode button check
    const lastRun = history[0];
    const fixBtn = el('btn-mode-fix');
    if (lastRun && lastRun.badIndices && lastRun.badIndices.length > 0) {
        fixBtn.style.display = 'flex';
        el('desc-fix').textContent = `Oxirgi testdagi ${lastRun.badIndices.length} ta xato qilingan savollar ustida ishlash.`;
        fixBtn.onclick = () => {
            startQuiz('Xatolar ustida ishlash', lastRun.badIndices, true, 0, 'fix');
        };
    } else {
        fixBtn.style.display = 'none';
    }

    // Render Blocks
    const bSize = 30;
    const nBlocks = Math.ceil(state.questions.length / bSize);
    const bestBlocks = DB.getBestBlocks();
    let blocksHTML = '';
    
    for(let i=0; i<nBlocks; i++) {
        const start = i * bSize;
        const end = Math.min(start + bSize, state.questions.length);
        const p = bestBlocks[i] || 0;
        blocksHTML += `
            <button class="block-btn" data-b="${i}">
                <span class="bb-sub">${i+1}-Blok</span>
                <span class="bb-title">${start + 1} – ${end}</span>
                <div class="bb-track"><div class="bb-fill" style="width: ${p}%"></div></div>
                <span class="bb-stat">${p ? 'Eng yaxshi: '+p+'%' : 'Hali topshirilmagan'}</span>
            </button>
        `;
    }
    el('blocks-container').innerHTML = blocksHTML;

    // Events
    el('blocks-container').onclick = (e) => {
        const btn = e.target.closest('.block-btn');
        if(!btn) return;
        const bIdx = parseInt(btn.dataset.b);
        const s = bIdx * bSize;
        const limit = Math.min(s + bSize, state.questions.length);
        const idxArr = Array.from({length: limit - s}, (_, k) => s + k);
        startQuiz(`${bIdx+1}-Blok (${s+1}–${limit})`, idxArr, true, 0, `b${bIdx}`);
    };

    el('btn-mode-all').onclick = () => {
        startQuiz(`To'liq rejim (${state.questions.length} ta)`, Array.from({length: state.questions.length}, (_, i) => i), true, 0, 'all');
    };

    el('btn-mode-rnd').onclick = () => {
        const n = Math.min(25, state.questions.length);
        startQuiz(`Imtihon (${n} ta tasodifiy)`, shuffle(Array.from({length: state.questions.length}, (_, i) => i)).slice(0, n), false, n * 60, 'rnd');
    };

    document.querySelectorAll('.view').forEach(v => v.classList.add('hide'));
    el('home').classList.remove('hide');
}

// ---------------- 2. STATISTIKA DASHBOARD ----------------
function renderStatsPage() {
    clearInterval(state.timerInt);
    document.querySelectorAll('.view').forEach(v => v.classList.add('hide'));
    el('stats').classList.remove('hide');

    const history = DB.getHistory();
    const bestBlocks = DB.getBestBlocks();
    
    // KPI Banner Computation
    const totalAttempts = history.length;
    const avgScore = totalAttempts ? Math.round(history.reduce((a, b) => a + b.percent, 0) / totalAttempts) : 0;
    const bestScore = totalAttempts ? Math.max(...history.map(x => x.percent)) : 0;
    const totalSecs = history.reduce((a, b) => a + (b.elapsed || 0), 0);
    const totalMins = Math.round(totalSecs / 60);

    el('st-total-attempts').textContent = totalAttempts;
    el('st-avg-score').textContent = avgScore + '%';
    el('st-best-score').textContent = bestScore + '%';
    el('st-total-time').textContent = totalMins + ' daq';

    // Export & Clear History Buttons
    el('btn-reset-stats').onclick = () => {
        if (confirm("Haqiqatdan ham barcha statistika va testlar tarixini o'chirmoqchimisiz?")) {
            DB.clearHistory();
            renderStatsPage();
        }
    };

    el('btn-export-stats').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `hr-quiz-stats-${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    };

    // Render Detailed Blocks Breakdown
    const bSize = 30;
    const nBlocks = Math.ceil(state.questions.length / bSize);
    let blockListHTML = '';
    
    for(let i=0; i<nBlocks; i++) {
        const start = i * bSize;
        const end = Math.min(start + bSize, state.questions.length);
        const p = bestBlocks[i] || 0;
        const statusText = p >= 85 ? "A'lo 🏆" : p >= 65 ? "Yaxshi 👍" : p > 0 ? "Takrorlash kerak ⚠️" : "Boshlanmagan";
        
        blockListHTML += `
            <div class="bp-card">
                <div class="bp-top">
                    <span class="bp-title">${i+1}-Blok (${start+1}–${end})</span>
                    <span class="bp-pct">${p}%</span>
                </div>
                <div class="bp-track"><div class="bp-bar" style="width: ${p}%"></div></div>
                <div class="bp-status">
                    <span>Holat: ${statusText}</span>
                    <span>30 ta savol</span>
                </div>
            </div>
        `;
    }
    el('stats-blocks-detail').innerHTML = blockListHTML;

    // Render History Table
    const tbody = el('history-table-body');
    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 30px;">Hali hech qanday test topshirilmadi.</td></tr>`;
    } else {
        tbody.innerHTML = history.map((r, idx) => {
            const dateStr = new Date(r.t).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
            const scoreClass = r.percent >= 80 ? 'score-high' : r.percent >= 50 ? 'score-mid' : 'score-low';
            return `
                <tr>
                    <td><b>#${history.length - idx}</b></td>
                    <td>${escapeHTML(r.mode || 'Test')}</td>
                    <td>${dateStr}</td>
                    <td>${formatTime(r.elapsed || 0)}</td>
                    <td>${r.c} / ${r.n}</td>
                    <td><span class="badge-score ${scoreClass}">${r.percent}%</span></td>
                </tr>
            `;
        }).join('');
    }

    // Render Charts
    renderAnalyticsCharts(history, bestBlocks, nBlocks);
}

function renderAnalyticsCharts(history, bestBlocks, nBlocks) {
    // Destroy existing chart instances
    ['statTrend', 'statBlock', 'statDist'].forEach(k => {
        if(state.charts[k]) state.charts[k].destroy();
    });

    // 1. Line Chart: Urinishlar Dinamikasi
    const last15 = [...history].reverse().slice(-15);
    const ctxTrend = el('statTrendChart').getContext('2d');
    
    state.charts.statTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: last15.map((_, i) => `Urinish ${i+1}`),
            datasets: [{
                label: 'Natija %',
                data: last15.map(h => h.percent),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 2. Bar Chart: Bloklar Bo'yicha Natija
    const blockLabels = Array.from({length: nBlocks}, (_, i) => `${i+1}-Blok`);
    const blockScores = Array.from({length: nBlocks}, (_, i) => bestBlocks[i] || 0);
    const ctxBlock = el('statBlockChart').getContext('2d');

    state.charts.statBlock = new Chart(ctxBlock, {
        type: 'bar',
        data: {
            labels: blockLabels,
            datasets: [{
                label: 'Eng yaxshi %',
                data: blockScores,
                backgroundColor: blockScores.map(val => val >= 70 ? '#10b981' : val > 0 ? '#3b82f6' : '#64748b'),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 3. Doughnut Chart: Overall Answers Distribution
    const totalCorrect = history.reduce((a, b) => a + (b.c || 0), 0);
    const totalWrong = history.reduce((a, b) => a + (b.w || 0), 0);
    const totalSkipped = history.reduce((a, b) => a + (b.s || 0), 0);
    const ctxDist = el('statDistributionChart').getContext('2d');

    state.charts.statDist = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: ['To‘g‘ri', 'Xato', 'O‘tkazilgan'],
            datasets: [{
                data: [totalCorrect || 1, totalWrong, totalSkipped],
                backgroundColor: ['#10b981', '#ef4444', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
            }
        }
    });
}

// ---------------- 3. QUIZ VIEW ----------------
function startQuiz(title, indices, isFeedbackMode, limitSeconds, runKey) {
    state.modeTitle = title;
    state.indices = indices;
    state.answers = indices.map(() => -1);
    state.currentIdx = 0;
    state.isFeedbackMode = isFeedbackMode;
    state.limit = limitSeconds;
    state.runKey = runKey;
    state.startTime = Date.now();

    el('quiz-title').textContent = title;

    
    // Setup Map Grid
    el('question-map').innerHTML = indices.map((_, i) => `<button class="qm-btn" data-i="${i}">${i+1}</button>`).join('');

    document.querySelectorAll('.view').forEach(v => v.classList.add('hide'));
    el('quiz').classList.remove('hide');
    window.scrollTo(0, 0);

    renderQuestion();

    clearInterval(state.timerInt);
    state.timerInt = setInterval(updateTimer, 500);
    updateTimer();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const timerEl = el('quiz-timer');
    if (state.limit > 0) {
        const rem = Math.max(0, state.limit - elapsed);
        timerEl.textContent = '⏱ ' + formatTime(rem);
        timerEl.classList.toggle('danger', rem < 60);
        if (rem <= 0) finishQuiz(true);
    } else {
        timerEl.textContent = '⏱ ' + formatTime(elapsed);
        timerEl.classList.remove('danger');
    }
}

function renderQuestion() {
    const qData = state.questions[state.indices[state.currentIdx]];
    const currentAns = state.answers[state.currentIdx];
    const total = state.indices.length;

    el('q-counter').textContent = `SAVOL ${state.currentIdx + 1} / ${total}`;
    el('q-text').innerHTML = escapeHTML(qData[0]);
    
    // Progress bar
    const answeredCount = state.answers.filter(a => a !== -1).length;
    el('quiz-progress').style.width = `${(answeredCount / total) * 100}%`;

    // Render Options
    let optsHTML = '';
    qData[1].forEach((opt, idx) => {
        let classes = 'option-btn';
        if (state.isFeedbackMode && currentAns !== -1) {
            classes += ' locked';
            if (idx === qData[2]) classes += ' correct';
            else if (idx === currentAns) classes += ' wrong';
            else classes += ' dim';
        } else {
            if (idx === currentAns) classes += ' selected';
        }
        optsHTML += `
            <button class="${classes}" data-opt="${idx}">
                <div class="ob-letter">${L[idx]}</div>
                <div class="ob-text">${escapeHTML(opt)}</div>
            </button>
        `;
    });
    el('options-list').innerHTML = optsHTML;

    // Nav Buttons
    el('btn-prev').disabled = state.currentIdx === 0;
    el('btn-next').textContent = state.currentIdx === total - 1 ? 'Yakunlash ✓' : 'Keyingi →';

    // Update Map
    document.querySelectorAll('.qm-btn').forEach((btn, i) => {
        const v = state.answers[i];
        let c = 'qm-btn';
        if (i === state.currentIdx) c += ' active';
        if (v !== -1) {
            if (state.isFeedbackMode) {
                c += v === state.questions[state.indices[i]][2] ? ' correct' : ' wrong';
            } else {
                c += ' ans';
            }
        }
        btn.className = c;
    });
}

// Quiz Handlers
el('options-list').onclick = (e) => {
    const btn = e.target.closest('.option-btn');
    if(!btn) return;
    if(state.isFeedbackMode && state.answers[state.currentIdx] !== -1) return;
    state.answers[state.currentIdx] = parseInt(btn.dataset.opt);
    renderQuestion();
};

el('question-map').onclick = (e) => {
    const btn = e.target.closest('.qm-btn');
    if(btn) {
        state.currentIdx = parseInt(btn.dataset.i);
        renderQuestion();
    }
};

el('btn-prev').onclick = () => {
    if(state.currentIdx > 0) { state.currentIdx--; renderQuestion(); }
};

el('btn-next').onclick = () => {
    if(state.currentIdx < state.indices.length - 1) {
        state.currentIdx++; renderQuestion();
    } else {
        finishQuiz(false);
    }
};

el('btn-exit').onclick = () => {
    if(confirm("Testdan chiqmoqchimisiz? Natijalar saqlanmaydi.")) {
        switchTab('home');
    }
};

// Keyboard Hotkeys
document.addEventListener('keydown', (e) => {
    if(!el('quiz').classList.contains('hide')) {
        const k = e.key.toLowerCase();
        if(['a','b','c','d','1','2','3','4'].includes(k)) {
            const map = {'a':0, '1':0, 'b':1, '2':1, 'c':2, '3':2, 'd':3, '4':3};
            const btn = document.querySelector(`.option-btn[data-opt="${map[k]}"]`);
            if(btn) btn.click();
        } else if(k === 'arrowright' || k === 'enter') el('btn-next').click();
        else if(k === 'arrowleft') el('btn-prev').click();
    }
});

// ---------------- 4. RESULT VIEW ----------------
function finishQuiz(force) {
    const unanswered = state.answers.filter(a => a === -1).length;
    if(!force && unanswered > 0) {
        if(!confirm(`${unanswered} ta savolga javob berilmadi. Baribir yakunlaysizmi?`)) return;
    }
    clearInterval(state.timerInt);
    
    const elapsed = Math.min(Math.floor((Date.now() - state.startTime) / 1000), state.limit || Infinity);
    const n = state.indices.length;
    
    let c = 0, w = 0, s = 0;
    const badIndices = [];

    const resArray = state.answers.map((ans, i) => {
        if(ans === -1) { s++; badIndices.push(state.indices[i]); return -1; }
        const isCorr = ans === state.questions[state.indices[i]][2];
        if(isCorr) { c++; return 1; }
        w++; badIndices.push(state.indices[i]); return 0;
    });

    const percent = Math.round((c / n) * 100);
    
    // Database sync
    DB.addHistory({ t: Date.now(), percent, mode: state.modeTitle, c, w, s, n, elapsed, badIndices });
    if(state.runKey && state.runKey.startsWith('b')) {
        DB.setBestBlock(parseInt(state.runKey.substring(1)), percent);
    }

    renderResultView({ n, c, w, s, percent, elapsed, resArray, badIndices });
}

function renderResultView(data) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hide'));
    el('result').classList.remove('hide');
    window.scrollTo(0, 0);

    el('score-percent').textContent = `${data.percent}%`;
    el('kpi-correct').textContent = data.c;
    el('kpi-wrong').textContent = data.w;
    el('kpi-skipped').textContent = data.s;
    el('kpi-time').textContent = formatTime(data.elapsed);

    const gObj = data.percent >= 90 ? { t: 'Ajoyib Natija! 🏆', d: 'Siz inson resurslarini boshqarish fanini mukammal egallabsiz.' }
               : data.percent >= 70 ? { t: 'Yaxshi Natija! 👏', d: 'Bilimlaringiz mustahkam, biroz takrorlash bilan a\'loga chiqasiz.' }
               : data.percent >= 50 ? { t: 'Qoniqarli 👍', d: 'Xatolar ustida ishlab, natijangizni yanada oshirishingiz mumkin.' }
               : { t: 'Ko‘proq mashq kerak 💪', d: 'Xatolar tahlilini ko‘rib chiqing va qayta urinib ko‘ring.' };
    
    el('res-greeting').textContent = gObj.t;
    el('res-msg').textContent = gObj.d;

    el('fc-all').textContent = data.w + data.s;
    el('fc-wrong').textContent = data.w;
    el('fc-skipped').textContent = data.s;

    const renderErrors = (filter) => {
        let html = '';
        data.resArray.forEach((status, i) => {
            if(status === 1) return; // skip correct ones
            if(filter === 'wrong' && status !== 0) return;
            if(filter === 'skipped' && status !== -1) return;
            
            const realQIdx = state.indices[i];
            const qData = state.questions[realQIdx];
            const userAns = state.answers[i];
            const corrAns = qData[2];

            html += `
                <div class="error-item ${status === -1 ? 'skipped' : ''}">
                    <div class="ei-meta">SAVOL ${i+1} · Bazadagi raqami №${realQIdx+1}</div>
                    <div class="ei-q">${escapeHTML(qData[0])}</div>
                    ${status === -1 
                        ? `<div class="ei-ans user-skip">Javob berilmagan</div>`
                        : `<div class="ei-ans user-wrong">✗ Sizning javobingiz: <b>${L[userAns]}) ${escapeHTML(qData[1][userAns])}</b></div>`
                    }
                    <div class="ei-ans correct">✓ To'g'ri javob: <b>${L[corrAns]}) ${escapeHTML(qData[1][corrAns])}</b></div>
                </div>
            `;
        });
        el('errors-container').innerHTML = html || '<div style="padding: 20px; text-align:center; color: var(--text-muted)">Ushbu toifada savollar mavjud emas. 🎉</div>';
    };

    renderErrors('all');

    el('error-filters').onclick = (e) => {
        const btn = e.target.closest('.ft-btn');
        if(!btn) return;
        document.querySelectorAll('.ft-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderErrors(btn.dataset.filter);
    };

    // Action Buttons
    el('btn-retry').onclick = () => {
        if(state.runKey === 'rnd') el('btn-mode-rnd').click();
        else startQuiz(state.modeTitle, [...state.indices], state.isFeedbackMode, state.limit, state.runKey);
    };

    const fixBtn = el('btn-fix-errors');
    if(data.badIndices.length > 0) {
        fixBtn.style.display = 'inline-flex';
        fixBtn.onclick = () => {
            startQuiz('Xatolar ustida ishlash', data.badIndices, true, 0, 'fix');
        };
    } else {
        fixBtn.style.display = 'none';
    }

    el('btn-view-full-stats').onclick = () => switchTab('stats');
    el('btn-home').onclick = () => switchTab('home');

    // Render Result Charts
    renderResultCharts(data);
}

function renderResultCharts(data) {
    if(state.charts.resScore) state.charts.resScore.destroy();
    if(state.charts.resTrend) state.charts.resTrend.destroy();
    if(state.charts.resBar) state.charts.resBar.destroy();

    // Score Donut
    const ctxScore = el('scoreChart').getContext('2d');
    state.charts.resScore = new Chart(ctxScore, {
        type: 'doughnut',
        data: {
            labels: ['To‘g‘ri', 'Xato', 'O‘tkazilgan'],
            datasets: [{
                data: [data.c, data.w, data.s],
                backgroundColor: ['#10b981', '#ef4444', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '75%', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Trend
    const history = DB.getHistory().slice(-8).reverse();
    const ctxTrend = el('resTrendChart').getContext('2d');
    state.charts.resTrend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: history.map((_, i) => `#${i+1}`),
            datasets: [{
                label: '%',
                data: history.map(h => h.percent),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } },
            plugins: { legend: { display: false } }
        }
    });

    // Bar breakdown
    const groupSize = Math.max(5, Math.ceil(data.n / 5));
    const labels = [];
    const accData = [];
    for(let i=0; i<data.n; i+=groupSize) {
        const end = Math.min(i + groupSize, data.n);
        labels.push(`${i+1}-${end}`);
        const slice = data.resArray.slice(i, end);
        const corrs = slice.filter(x => x===1).length;
        accData.push(Math.round((corrs / slice.length) * 100));
    }

    const ctxBar = el('resBarChart').getContext('2d');
    state.charts.resBar = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: accData,
                backgroundColor: accData.map(v => v >= 70 ? '#10b981' : '#3b82f6'),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } },
            plugins: { legend: { display: false } }
        }
    });
}

// Background Particle Effects
function initBackgroundCanvas() {
    const c = el('fx');
    if(!c) return;
    const ctx = c.getContext('2d');
    let w, h, P = [];

    const resize = () => {
        w = c.width = window.innerWidth;
        h = c.height = window.innerHeight;
        P = Array.from({length: Math.min(45, Math.floor(w/25))}, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 2 + 1,
            color: Math.random() > 0.5 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'
        }));
    };

    resize();
    window.addEventListener('resize', resize);

    function loop() {
        ctx.clearRect(0, 0, w, h);
        P.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0 || p.x > w) p.vx *= -1;
            if(p.y < 0 || p.y > h) p.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            for(let j = i + 1; j < P.length; j++) {
                const p2 = P[j];
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if(dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - dist/120)})`;
                    ctx.stroke();
                }
            }
        });
        requestAnimationFrame(loop);
    }
    loop();
}
