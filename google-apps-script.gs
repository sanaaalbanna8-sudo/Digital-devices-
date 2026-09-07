/**
 * الصق هذا الملف داخل Apps Script المرتبط بالجدول:
 * https://docs.google.com/spreadsheets/d/1953_pOPPkQPvjTzq6lYrMfNkddHzC9X0bB9zh8jr9VA/edit
 *
 * ثم: نشر → نشر جديد → تطبيق ويب
 * التنفيذ: أنا  |  من يمكنه الوصول: أي شخص
 * انسخ رابط Web App والصقه في js/config.js
 */

var SHEET_ID = "1953_pOPPkQPvjTzq6lYrMfNkddHzC9X0bB9zh8jr9VA";

function doGet() {
  return ContentService.createTextOutput("دليل الأجهزة الرقمية — جاهز لاستقبال النتائج");
}

function boundSpreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  return SpreadsheetApp.openById(SHEET_ID);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var data = readPayload_(e);
    var kind = String(data.kind || "");
    var ss = boundSpreadsheet_();

    if (kind === "quiz") {
      writeQuiz_(ss, data);
    } else if (kind === "lab") {
      writeLab_(ss, data);
    } else {
      throw new Error("unknown kind: " + kind);
    }

    return jsonOut_({ ok: true, kind: kind });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function writeQuiz_(ss, data) {
  var sumHead = [
    "الاسم", "الشعبة", "التاريخ والوقت",
    "صحيحة", "خاطئة", "المجموع", "النسبة %",
    "ملخص الصحيحة", "ملخص الخاطئة"
  ];
  var detHead = [
    "الاسم", "الشعبة", "التاريخ والوقت",
    "رقم السؤال", "السؤال",
    "إجابة الطالب", "الإجابة الصحيحة",
    "النتيجة", "التفسير"
  ];
  var summary = ensureSheet_(ss, "اختبر نفسك - ملخص", sumHead);
  var details = ensureSheet_(ss, "اختبر نفسك - تفاصيل", detHead);

  summary.appendRow([
    data.name || "",
    data.klass || "",
    data.when || "",
    data.correct || 0,
    data.wrong || 0,
    data.total || 0,
    data.percent || 0,
    data.correctSummary || "",
    data.wrongSummary || ""
  ]);

  (data.details || []).forEach(function (row) {
    details.appendRow([
      data.name || "",
      data.klass || "",
      data.when || "",
      row.num || "",
      row.question || "",
      row.chosen || "",
      row.correctText || "",
      row.result || "",
      row.explain || ""
    ]);
  });
}

function writeLab_(ss, data) {
  var sumHead = [
    "الاسم", "الشعبة", "التاريخ والوقت",
    "قرارات صحيحة", "قرارات خاطئة", "لم يجب",
    "عدد السيناريوهات", "النسبة %",
    "ملخص الاختيارات"
  ];
  var detHead = [
    "الاسم", "الشعبة", "التاريخ والوقت",
    "رقم السيناريو", "عنوان السيناريو", "وصف الحالة",
    "اختيار الطالب", "الخيار الصحيح",
    "النتيجة", "سبب القرار", "أجاب؟"
  ];
  var summary = ensureSheet_(ss, "مختبر البنية - ملخص", sumHead);
  var details = ensureSheet_(ss, "مختبر البنية - تفاصيل", detHead);

  summary.appendRow([
    data.name || "",
    data.klass || "",
    data.when || "",
    data.correct || 0,
    data.wrong || 0,
    data.skipped || 0,
    data.total || 0,
    data.percent || 0,
    data.choiceSummary || ""
  ]);

  (data.details || []).forEach(function (row) {
    details.appendRow([
      data.name || "",
      data.klass || "",
      data.when || "",
      row.num || "",
      row.title || "",
      row.brief || "",
      row.chosen || "",
      row.correctText || "",
      row.result || "",
      row.why || "",
      row.answered || ""
    ]);
  });
}

function firstText_(v) {
  if (v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Array]") {
    v = v.length ? v[0] : "";
  }
  return String(v);
}

function tryParseJson_(text) {
  if (!text) return null;
  try {
    var obj = JSON.parse(text);
    if (obj && typeof obj === "object") return obj;
  } catch (err) {
    try {
      var obj2 = JSON.parse(String(text).replace(/^\uFEFF/, "").trim());
      if (obj2 && typeof obj2 === "object") return obj2;
    } catch (err2) {}
  }
  return null;
}

function tryParseForm_(text) {
  if (!text || text.indexOf("=") < 0) return null;
  var parts = String(text).split("&");
  for (var i = 0; i < parts.length; i++) {
    var eq = parts[i].indexOf("=");
    if (eq < 0) continue;
    var key = parts[i].slice(0, eq);
    var val = parts[i].slice(eq + 1);
    try { key = decodeURIComponent(key.replace(/\+/g, " ")); } catch (e1) {}
    if (key !== "payload" && key !== "data") continue;
    try { val = decodeURIComponent(val.replace(/\+/g, " ")); } catch (e2) {}
    var parsed = tryParseJson_(val);
    if (parsed) return parsed;
  }
  return null;
}

function readPayload_(e) {
  e = e || {};
  var p = e.parameter || {};
  var ps = e.parameters || {};
  var raw = e.postData && e.postData.contents ? String(e.postData.contents) : "";
  var candidates = [p.payload, p.data, ps.payload, ps.data, raw];
  for (var i = 0; i < candidates.length; i++) {
    var text = firstText_(candidates[i]);
    if (!text) continue;
    var asJson = tryParseJson_(text);
    if (asJson) return asJson;
    var asForm = tryParseForm_(text);
    if (asForm) return asForm;
  }
  throw new Error("empty body");
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
