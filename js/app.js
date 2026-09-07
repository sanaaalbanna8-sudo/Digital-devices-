const $app = document.getElementById("app");
const ICONS = {
  oven: "♨", clock: "⏱", wash: "🧺", car: "🚗", tractor: "🚜", ear: "🎧",
  bike: "🏍", plane: "✈", med: "✚", heat: "🌡", light: "💡",
  mfd: "🖨", desktop: "🖥", laptop: "💻", "aio-pc": "🖥", smartphone: "📱",
  "modular-phone": "🔧", "specialized-phone": "☎", tablet: "📲", wearable: "⌚",
  "physical-server": "🗄", cloud: "☁", entertainment: "📺", camera: "📷",
  gps: "🗺", "data-capture": "📡", medical: "🏥", comms: "📶", retail: "💳",
};

let savedStudent = {};
try { savedStudent = JSON.parse(localStorage.getItem("dd-student") || "{}") || {}; } catch (_) {}
const state = {
  filter: "all",
  search: "",
  scenario: 0,
  picked: {},
  quiz: 0,
  answers: {},
  seen: JSON.parse(localStorage.getItem("dd-seen") || "[]"),
  student: {
    name: savedStudent.name || "",
    klass: savedStudent.klass || "",
  },
  afterIdentity: "",
  quizSent: false,
  labSent: false,
  sendNote: "",
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
    const on = key === "catalog"
      ? here === "catalog" || here === "device"
      : key === "decisions"
        ? here === "decisions" || here === "lab-results"
        : here === key;
    a.classList.toggle("active", on);
  });
  if (!parts.length) return renderHome();
  if (parts[0] === "catalog") return renderCatalog();
  if (parts[0] === "device") return renderDevice(parts[1]);
  if (parts[0] === "decisions") {
    if (needIdentity("decisions")) return;
    return renderDecisions();
  }
  if (parts[0] === "lab-results") {
    if (needIdentity("lab-results")) return;
    return renderLabResults();
  }
  if (parts[0] === "glossary") return renderGlossary();
  if (parts[0] === "quiz") {
    if (needIdentity("quiz")) return;
    return renderQuiz();
  }
  renderHome();
}

function saveStudent() {
  localStorage.setItem("dd-student", JSON.stringify(state.student));
}

function needIdentity(next) {
  if (state.student.name.trim()) return false;
  state.afterIdentity = next;
  renderIdentity();
  return true;
}

function nowStamp() {
  return new Date().toLocaleString("ar-JO", { dateStyle: "short", timeStyle: "medium" });
}

function sheetsUrl() {
  return String((window.DD_CLOUD || {}).sheetsUrl || "").trim();
}

function sendCloud(pack) {
  const url = sheetsUrl();
  if (!url) return "missing";
  const body = JSON.stringify(pack);
  try {
    let form = document.getElementById("ddCloudForm");
    if (!form) {
      form = document.createElement("form");
      form.id = "ddCloudForm";
      form.method = "POST";
      form.target = "ddSink";
      form.acceptCharset = "UTF-8";
      form.style.display = "none";
      ["payload", "data"].forEach((name) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.appendChild(input);
      });
      document.body.appendChild(form);
    }
    form.action = url;
    form.querySelector("[name=payload]").value = body;
    form.querySelector("[name=data]").value = body;
    form.submit();
    return "sent";
  } catch (err) {
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: "payload=" + encodeURIComponent(body),
      });
      return "sent";
    } catch (err2) {
      return "fail";
    }
  }
}

function sendStatusHtml() {
  if (state.sendNote === "sent") {
    return `<p class="send-status ok">حُفظت النتيجة التفصيلية في جدول Google.</p>`;
  }
  if (state.sendNote === "missing") {
    return `<p class="send-status bad">لم يُلصق رابط Web App بعد في js/config.js — راجع ملف SETUP-SHEETS.txt</p>`;
  }
  if (state.sendNote === "fail") {
    return `<p class="send-status bad">تعذّر الإرسال. تحققي من النشر وأن الجدول مفتوح لنفس الحساب.</p>`;
  }
  return "";
}

function quizPayload() {
  const details = QUIZ.map((item, i) => {
    const chosenIdx = state.answers[i];
    const ok = chosenIdx === item.answer;
    return {
      num: i + 1,
      question: item.q,
      chosen: chosenIdx === undefined ? "لم يجب" : item.options[chosenIdx],
      correctText: item.options[item.answer],
      result: chosenIdx === undefined ? "لم يجب" : (ok ? "صحيح" : "خطأ"),
      explain: item.explain,
    };
  });
  const correct = details.filter((d) => d.result === "صحيح").length;
  const wrong = details.filter((d) => d.result === "خطأ").length;
  return {
    kind: "quiz",
    name: state.student.name.trim(),
    klass: state.student.klass.trim(),
    when: nowStamp(),
    correct,
    wrong,
    total: QUIZ.length,
    percent: Math.round((correct / QUIZ.length) * 100),
    correctSummary: details.filter((d) => d.result === "صحيح").map((d) => "س" + d.num).join("، ") || "لا يوجد",
    wrongSummary: details.filter((d) => d.result !== "صحيح").map((d) => "س" + d.num + ": " + d.chosen).join(" | ") || "لا يوجد",
    details,
  };
}

function labPayload() {
  const details = SCENARIOS.map((s, i) => {
    const pickId = state.picked[s.id];
    const chosen = s.options.find((o) => o.id === pickId);
    const correctOpt = s.options.find((o) => o.ok);
    const answered = Boolean(chosen);
    const ok = answered && chosen.ok;
    return {
      num: i + 1,
      title: s.title,
      brief: s.brief,
      chosen: answered ? chosen.label : "لم يختر",
      correctText: correctOpt ? correctOpt.label : "",
      result: !answered ? "لم يجب" : (ok ? "صحيح" : "خطأ"),
      why: chosen ? chosen.why : (correctOpt ? correctOpt.why : ""),
      answered: answered ? "نعم" : "لا",
    };
  });
  const correct = details.filter((d) => d.result === "صحيح").length;
  const wrong = details.filter((d) => d.result === "خطأ").length;
  const skipped = details.filter((d) => d.result === "لم يجب").length;
  return {
    kind: "lab",
    name: state.student.name.trim(),
    klass: state.student.klass.trim(),
    when: nowStamp(),
    correct,
    wrong,
    skipped,
    total: SCENARIOS.length,
    percent: Math.round((correct / SCENARIOS.length) * 100),
    choiceSummary: details.map((d) => d.num + ") " + d.result + " — " + d.chosen).join(" | "),
    details,
  };
}

function submitQuizOnce() {
  if (state.quizSent) return;
  state.quizSent = true;
  state.sendNote = sendCloud(quizPayload());
}

function submitLabOnce() {
  if (state.labSent) return;
  state.labSent = true;
  state.sendNote = sendCloud(labPayload());
}

function renderIdentity() {
  $app.innerHTML = `
    <p class="kicker">قبل البدء</p>
    <h1>اسم الطالب يظهر في الجدول</h1>
    <p class="lead">نكتب الاسم والشعبة مرة واحدة، ثم تُحفظ نتائج اختبر نفسك ومختبر البنية كلٌّ في ورقته مع تفاصيل كل سؤال.</p>
    <form class="player-form panel" id="id-form" novalidate>
      <label>
        اسم الطالب
        <input type="text" id="student-name" autocomplete="name" required value="${esc(state.student.name)}" />
      </label>
      <label>
        الشعبة / الصف
        <input type="text" id="student-class" autocomplete="off" value="${esc(state.student.klass)}" placeholder="مثال: 11 ت" />
      </label>
      <small class="field-error hidden" id="name-error">اكتبي الاسم حتى تُحفظ النتيجة باسمك.</small>
      <button type="submit" class="btn">متابعة</button>
    </form>
  `;
  $app.querySelector("#id-form").onsubmit = (e) => {
    e.preventDefault();
    const name = $app.querySelector("#student-name").value.trim();
    const klass = $app.querySelector("#student-class").value.trim();
    const err = $app.querySelector("#name-error");
    if (!name) {
      err.classList.remove("hidden");
      return;
    }
    state.student = { name, klass };
    saveStudent();
    location.hash = "#/" + (state.afterIdentity || "quiz");
  };
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
        <h3>مختبر البنية</h3>
        <p>سيناريوهات شركة حقيقية. اختر البديل ثم اقرأ لماذا القرار مهني أو لا. النتيجة تُحفظ في الجدول.</p>
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
    <p class="kicker">مختبر البنية · ${state.scenario + 1} / ${SCENARIOS.length}</p>
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
    if (state.scenario === SCENARIOS.length - 1) location.hash = "#/lab-results";
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

function renderLabResults() {
  submitLabOnce();
  const pack = labPayload();
  $app.innerHTML = `
    <p class="kicker">مختبر البنية · النتيجة</p>
    <h1>تقرير قراراتك المؤسسية</h1>
    <div class="score-ring" style="--p:${pack.percent}"><span>${pack.correct}/${pack.total}</span></div>
    <p class="lead" style="text-align:center">${esc(state.student.name)} — صحيحة ${pack.correct} · خاطئة ${pack.wrong} · لم يجب ${pack.skipped}</p>
    ${sendStatusHtml()}
    <div class="result-list">
      ${pack.details.map((d) => `
        <article class="term">
          <h3>${d.num}. ${esc(d.title)} · ${esc(d.result)}</h3>
          <p><strong>اخترت:</strong> ${esc(d.chosen)}</p>
          <p><strong>الأصح:</strong> ${esc(d.correctText)}</p>
          <p>${esc(d.why)}</p>
        </article>
      `).join("")}
    </div>
    <p class="pager">
      <button class="btn ghost" id="lab-retry">إعادة المختبر</button>
      <a class="btn" href="#/quiz" style="text-decoration:none">انتقل لاختبر نفسك</a>
    </p>
  `;
  $app.querySelector("#lab-retry").onclick = () => {
    state.picked = {};
    state.scenario = 0;
    state.labSent = false;
    state.sendNote = "";
    location.hash = "#/decisions";
  };
}

function renderQuiz() {
  if (state.quiz >= QUIZ.length) {
    submitQuizOnce();
    const pack = quizPayload();
    $app.innerHTML = `
      <p class="kicker">اختبر نفسك · النتيجة</p>
      <h1>أداء اتخاذ القرار</h1>
      <div class="score-ring" style="--p:${pack.percent}"><span>${pack.correct}/${pack.total}</span></div>
      <p class="lead" style="text-align:center">${esc(state.student.name)} — ${pack.correct} صحيحة من ${pack.total} · ${pack.percent}%</p>
      ${sendStatusHtml()}
      <div class="result-list">
        ${pack.details.map((d) => `
          <article class="term">
            <h3>سؤال ${d.num} · ${esc(d.result)}</h3>
            <p>${esc(d.question)}</p>
            <p><strong>إجابتك:</strong> ${esc(d.chosen)}</p>
            <p><strong>الصحيحة:</strong> ${esc(d.correctText)}</p>
            <p>${esc(d.explain)}</p>
          </article>
        `).join("")}
      </div>
      <p class="lead" style="text-align:center">القاعدة الذهبية: طابق الجهاز مع المهمة، والموقع، والتكلفة التشغيلية، والسياسة — لا مع الإعلان.</p>
      <p style="text-align:center"><button class="btn" id="retry">إعادة الاختبار</button></p>
    `;
    $app.querySelector("#retry").onclick = () => {
      state.quiz = 0;
      state.answers = {};
      state.quizSent = false;
      state.sendNote = "";
      renderQuiz();
    };
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
