const $app = document.getElementById("app");
const ICONS = {
  oven: "♨", clock: "⏱", wash: "🧺", car: "🚗", tractor: "🚜", ear: "🎧",
  bike: "🏍", plane: "✈", med: "✚", heat: "🌡", light: "💡",
  mfd: "🖨", desktop: "🖥", laptop: "💻", "aio-pc": "🖥", smartphone: "📱",
  "modular-phone": "🔧", "specialized-phone": "☎", tablet: "📲", wearable: "⌚",
  "physical-server": "🗄", cloud: "☁", entertainment: "📺", camera: "📷",
  gps: "🗺", "data-capture": "📡", medical: "🏥", comms: "📶", retail: "💳",
};

const state = {
  filter: "all",
  search: "",
  scenario: 0,
  picked: {},
  quiz: 0,
  answers: {},
  seen: JSON.parse(localStorage.getItem("dd-seen") || "[]"),
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  document.querySelectorAll(".nav a").forEach((a) => {
    const key = a.dataset.nav;
    const here = parts[0] || "home";
    const on = key === "catalog" ? here === "catalog" || here === "device" : here === key;
    a.classList.toggle("active", on);
  });
  if (!parts.length) return renderHome();
  if (parts[0] === "catalog") return renderCatalog();
  if (parts[0] === "device") return renderDevice(parts[1]);
  if (parts[0] === "decisions") return renderDecisions();
  if (parts[0] === "glossary") return renderGlossary();
  if (parts[0] === "quiz") return renderQuiz();
  renderHome();
}

function markSeen(id) {
  if (!state.seen.includes(id)) {
    state.seen.push(id);
    localStorage.setItem("dd-seen", JSON.stringify(state.seen));
  }
}

function photo(src, alt, icon) {
  return `
    <div class="thumb" style="background-image:url('${esc(src)}')">
      <div class="fallback" hidden>${icon}</div>
      <span class="code"></span>
    </div>
  `.replace('<span class="code"></span>', "");
}

function bindBrokenImages(root) {
  root.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      const fb = img.parentElement.querySelector(".fallback");
      if (fb) fb.hidden = false;
    });
  });
}

function renderHome() {
  $app.innerHTML = `
    <section class="hero">
      <div>
        <p class="kicker">${esc(APP.outcome)}</p>
        <h1>${esc(APP.title)}</h1>
        <p class="lead">
          هذا الدليل يحوّل نص الوحدة إلى قرارات عملية: ما شكل الجهاز؟ ماذا يفعل؟
          ومتى تختاره المؤسسة بدل بديله من نفس التصنيف. أنت طالب تكنولوجيا معلومات،
          مهمتك بناء بنية تحتية صحيحة لا شراء أحدث جهاز في الكتالوج.
        </p>
      </div>
      <aside class="hero-art">
        <p class="kicker" style="color:#f0c36a">من النص إلى القرار</p>
        <h2>18 جهازًا ونظامًا</h2>
        <p>مع مقارنة بدائل ومختبر سيناريوهات مؤسسية.</p>
        <div class="stat-grid">
          <div class="stat"><b>${DEVICES.length}</b> جهازًا</div>
          <div class="stat"><b>${SCENARIOS.length}</b> قرارات</div>
          <div class="stat"><b>${state.seen.length}</b> تعرّفت عليها</div>
        </div>
      </aside>
    </section>

    <div class="grid-3">
      <article class="outcome"><h3>1. يتعرّف الشكل والوظيفة</h3><p>صورة + وصف بصري حتى يميّز الطالب الجهاز في الواقع لا في التعريف فقط.</p></article>
      <article class="outcome"><h3>2. يربطه بالمؤسسة</h3><p>متى نشتريه؟ لمن من أصحاب المصلحة يخدم؟ وكيف يدخل في الشبكة والسياسات.</p></article>
      <article class="outcome"><h3>3. يقارن البدائل</h3><p>مثل 5 طابعات مقابل MFD واحد، ومكتبي مقابل لابتوب، وFTTC مقابل FTTP.</p></article>
    </div>

    <h2 class="section-title">حواسيب مخفية في الحياة اليومية</h2>
    <p class="progress-note">النص يذكّر أن الحاسوب لا يعني صندوقًا على المكتب فقط. الشركات تعتمد تقنيات رقمية منذ زمن طويل داخل أجهزة مألوفة.</p>
    <div class="hidden-wrap">
      ${HIDDEN_COMPUTERS.map((h) => `
        <article class="hidden-card">
          <div class="ic">${h.icon === "med" ? "+" : ICONS[h.icon] || "•"}</div>
          <b>${esc(h.name)}</b>
          <span>${esc(h.use)}</span>
        </article>
      `).join("")}
    </div>

    <h2 class="section-title">ابدأ من هنا</h2>
    <div class="grid-3">
      <a class="outcome" href="#/catalog" style="text-decoration:none">
        <h3>معرض الأجهزة</h3>
        <p>كل جهاز من النص: اسمه، صورته، استخدامه المؤسسي، ومقارنة بدائله.</p>
      </a>
      <a class="outcome" href="#/decisions" style="text-decoration:none">
        <h3>مختبر القرار</h3>
        <p>سيناريوهات شركة حقيقية. اختر البديل ثم اقرأ لماذا القرار مهني أو لا.</p>
      </a>
      <a class="outcome" href="#/quiz" style="text-decoration:none">
        <h3>اختبر فهمك</h3>
        <p>أسئلة قصيرة على التحليل واتخاذ القرار لا على الحفظ.</p>
      </a>
    </div>
  `;
}

function filteredDevices() {
    const q = state.search.trim().toLowerCase();
    return DEVICES.filter((d) => {
    const catOk = state.filter === "all" || d.category === state.filter;
    const text = `${d.name} ${d.nameEn} ${d.short} ${d.aka}`.toLowerCase().includes(q);
    return catOk && text;
  });
}

function renderCatalog() {
  const list = filteredDevices();
  $app.innerHTML = `
    <p class="kicker">معرض تفاعلي</p>
    <h1>الأجهزة الرقمية في أنظمة IT</h1>
    <p class="lead">اضغط أي جهاز لترى شكله، وظيفته، ومتى تستخدمه في البنية التحتية، ومقارنة بدائله.</p>
    <div class="toolbar">
      <div class="chips">
        ${CATEGORIES.map((c) => `<button class="chip ${state.filter === c.id ? "active" : ""}" data-filter="${c.id}">${esc(c.name)}</button>`).join("")}
      </div>
      <input class="search" id="q" type="search" placeholder="ابحث عن جهاز…" value="${esc(state.search)}" />
    </div>
    <p class="progress-note">${list.length} جهازًا · تعرّفت على ${state.seen.length} من ${DEVICES.length}</p>
    <div class="cards">
      ${list.map((d) => `
        <button class="device-card" data-go="${d.id}">
          <div class="thumb">
            <img src="${esc(d.image)}" alt="${esc(d.imageAlt)}" />
            <div class="fallback" hidden>${ICONS[d.id] || "•"}</div>
            <span class="code">${d.code} ${state.seen.includes(d.id) ? "✓" : ""}</span>
          </div>
          <div class="card-body">
            <small>${esc(d.nameEn)}</small>
            <h3>${esc(d.name)}</h3>
            <p>${esc(d.short)}</p>
          </div>
        </button>
      `).join("")}
    </div>
  `;
  bindBrokenImages($app);
  $app.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.onclick = () => { state.filter = btn.dataset.filter; renderCatalog(); };
  });
  $app.querySelectorAll("[data-go]").forEach((btn) => {
    btn.onclick = () => { location.hash = `#/device/${btn.dataset.go}`; };
  });
  const q = $app.querySelector("#q");
  q.addEventListener("input", () => {
    state.search = q.value;
    const caret = q.selectionStart;
    renderCatalog();
    const el = document.getElementById("q");
    if (el) {
      el.focus();
      try { el.setSelectionRange(caret, caret); } catch (_) {}
    }
  });
}

function renderDevice(id) {
  const d = DEVICES.find((x) => x.id === id);
  if (!d) return renderCatalog();
  markSeen(d.id);
  const alt = d.alternatives[0];
  const family = DEVICES.filter((x) => x.family === d.family && x.id !== d.id);
  $app.innerHTML = `
    <a class="back" href="#/catalog">← رجوع للمعرض</a>
    <section class="detail">
      <div class="detail-photo">
        <img src="${esc(d.image)}" alt="${esc(d.imageAlt)}" />
        <div class="fallback" hidden>${ICONS[d.id] || "•"}</div>
        <div class="look-box"><strong>كيف شكله؟</strong> ${esc(d.look)}</div>
      </div>
      <div>
        <span class="badge">${esc(d.code)} · ${esc(d.nameEn)}</span>
        <h1 style="margin-top:8px">${esc(d.name)}</h1>
        <p class="lead">${esc(d.short)}</p>
        <p>${esc(d.aka)}</p>
        <p><strong>لماذا يهم البنية التحتية؟</strong> ${esc(d.why)}</p>
        <h3>متى نستخدمه في المؤسسة؟</h3>
        <ul class="org-list">${d.org.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      </div>
    </section>
    <div class="lists">
      <article class="panel choose"><h3>اختره عندما</h3><ul>${d.chooseWhen.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></article>
      <article class="panel avoid"><h3>لا تختره عندما</h3><ul>${d.avoidWhen.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></article>
    </div>
    <article class="compare">
      <h3>${esc(alt.vs)}</h3>
      <div class="compare-grid">
        <div><b>${esc(alt.pickA)}</b><p>${esc(alt.a)}</p></div>
        <div class="vs">ضد</div>
        <div><b>${esc(alt.pickB)}</b><p>${esc(alt.b)}</p></div>
      </div>
      <div class="verdict">قرار مهني: ${esc(alt.verdict)}</div>
    </article>
    <p class="stake-note"><strong>أصحاب المصلحة:</strong> ${esc(d.stakeholders)}</p>
    <p class="infra-note"><strong>ملاحظة بنية تحتية:</strong> ${esc(d.infra)}</p>
    ${family.length ? `<h3 class="section-title">بدائل من التصنيف نفسه</h3><div class="family-row">${family.map((f) => `<a href="#/device/${f.id}">${esc(f.name)}</a>`).join("")}</div>` : ""}
  `;
  bindBrokenImages($app);
}

function renderDecisions() {
  const s = SCENARIOS[state.scenario];
  const pick = state.picked[s.id];
  $app.innerHTML = `
    <p class="kicker">مختبر القرار · ${state.scenario + 1} / ${SCENARIOS.length}</p>
    <h1>ابنِ البنية ولا تجمع أجهزة</h1>
    <p class="lead">اقرأ قصة المؤسسة ثم اختر بديلًا واحدًا. الاختيار الخاطئ ليس نهاية الدرس: اقرأ السبب وتعلّم القاعدة.</p>
    <article class="panel scenario">
      <div class="scenario-head">
        <span class="badge">سيناريو مؤسسي</span>
        <h2 style="margin-top:8px">${esc(s.title)}</h2>
        <p>${esc(s.brief)}</p>
      </div>
      <div style="padding:8px 20px 20px">
        ${s.options.map((o) => `
          <button class="choice ${pick === o.id ? (o.ok ? "good" : "bad") : ""}" data-opt="${o.id}">${esc(o.label)}</button>
        `).join("")}
        <div class="feedback" id="fb">${pick ? esc(s.options.find((o) => o.id === pick).why) : ""}</div>
        <div class="pager">
          <button class="btn ghost" id="prev" ${state.scenario === 0 ? "disabled" : ""}>السابق</button>
          <button class="btn" id="next">${state.scenario === SCENARIOS.length - 1 ? "إنهاء الجولة" : "السيناريو التالي"}</button>
        </div>
      </div>
    </article>
  `;
  $app.querySelectorAll("[data-opt]").forEach((btn) => {
    btn.onclick = () => {
      state.picked[s.id] = btn.dataset.opt;
      renderDecisions();
    };
  });
  $app.querySelector("#prev").onclick = () => { state.scenario = Math.max(0, state.scenario - 1); renderDecisions(); };
  $app.querySelector("#next").onclick = () => {
    if (state.scenario === SCENARIOS.length - 1) location.hash = "#/quiz";
    else { state.scenario += 1; renderDecisions(); }
  };
}

function renderGlossary() {
  $app.innerHTML = `
    <p class="kicker">المصطلحات الرئيسة من النص</p>
    <h1>لغة القرار المؤسسي</h1>
    <p class="lead">الجهاز بلا سياسة وإجراء وأصحاب مصلحة مجرد صندوق. هذه الكلمات تُستخدم وأنت تبرر الشراء.</p>
    <div class="grid-2">
      ${GLOSSARY.map((g) => `<article class="term"><h3>${esc(g.term)}</h3><p>${esc(g.def)}</p></article>`).join("")}
    </div>
  `;
}

function renderQuiz() {
  if (state.quiz >= QUIZ.length) {
    const score = Object.entries(state.answers).filter(([i, a]) => QUIZ[i].answer === a).length;
    const p = Math.round((score / QUIZ.length) * 100);
    $app.innerHTML = `
      <p class="kicker">النتيجة</p>
      <h1>أداء اتخاذ القرار</h1>
      <div class="score-ring" style="--p:${p}"><span>${score}/${QUIZ.length}</span></div>
      <p class="lead" style="text-align:center">القاعدة الذهبية: طابق الجهاز مع المهمة، والموقع، والتكلفة التشغيلية، والسياسة — لا مع الإعلان.</p>
      <p style="text-align:center"><button class="btn" id="retry">إعادة الاختبار</button></p>
    `;
    $app.querySelector("#retry").onclick = () => { state.quiz = 0; state.answers = {}; renderQuiz(); };
    return;
  }
  const item = QUIZ[state.quiz];
  const chosen = state.answers[state.quiz];
  $app.innerHTML = `
    <p class="kicker">سؤال ${state.quiz + 1} من ${QUIZ.length}</p>
    <article class="panel quiz-card">
      <h2>${esc(item.q)}</h2>
      ${item.options.map((o, i) => {
        let cls = "opt";
        if (chosen !== undefined) {
          if (i === item.answer) cls += " good";
          else if (i === chosen) cls += " bad";
        }
        return `<button class="${cls}" data-i="${i}">${esc(o)}</button>`;
      }).join("")}
      <p class="feedback">${chosen !== undefined ? esc(item.explain) : ""}</p>
      <div class="pager">
        <span class="progress-note">${chosen !== undefined ? "اقرأ التفسير ثم انتقل" : "اختر إجابة"}</span>
        <button class="btn" id="nextQ" ${chosen === undefined ? "disabled" : ""}>التالي</button>
      </div>
    </article>
  `;
  $app.querySelectorAll("[data-i]").forEach((btn) => {
    btn.onclick = () => {
      if (state.answers[state.quiz] !== undefined) return;
      state.answers[state.quiz] = Number(btn.dataset.i);
      renderQuiz();
    };
  });
  const n = $app.querySelector("#nextQ");
  if (n) n.onclick = () => { state.quiz += 1; renderQuiz(); };
}

window.addEventListener("hashchange", route);
document.getElementById("theme-btn").onclick = () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next === "dark" ? "dark" : "");
  localStorage.setItem("dd-theme", next);
  document.getElementById("theme-btn").textContent = next === "dark" ? "☀" : "☾";
};
(() => {
  const t = localStorage.getItem("dd-theme");
  if (t === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("theme-btn").textContent = "☀";
  }
})();
route();
