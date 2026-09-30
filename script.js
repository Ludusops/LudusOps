/* ==========================================================================
   Ludus Ops — script.js
   Solo interacción. No controla layout por scroll.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var t = function (s) { return window.LudusI18n ? window.LudusI18n.t(s) : s; };

  /* ----------------------------- THEME ----------------------------------- */
  function initTheme() {
    var root = document.documentElement;
    var btn = document.getElementById("themeToggle");
    var meta = document.querySelector('meta[name="theme-color"]');

    function sync() {
      var light = root.getAttribute("data-theme") === "light";
      if (meta) meta.setAttribute("content", light ? "#F5F7F8" : "#0A0E12");
      if (btn) btn.setAttribute("aria-label", t(light ? "Activar modo oscuro" : "Activar modo claro"));
    }

    if (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("ludus-theme", next); } catch (e) {}
        sync();
      });
    }
    document.addEventListener("ludus:langchange", sync);
    sync();
  }

  /* ----------------------------- NAVBAR ---------------------------------- */
  function initNav() {
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");

    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("is-scrolled", window.scrollY > 24);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", t(open ? "Cerrar menú" : "Abrir menú"));
      });
      links.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ----------------------------- REVEAL ---------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var group = el.closest("[data-reveal-group]");
        var delay = 0;
        if (group) {
          var siblings = Array.prototype.slice.call(group.querySelectorAll("[data-reveal]"));
          delay = Math.min(siblings.indexOf(el), 5) * 80;
        }
        window.setTimeout(function () { el.classList.add("is-visible"); }, delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ----------------------------- METHOD LINE ----------------------------- */
  function initMethodLine() {
    var line = document.querySelector(".step-line");
    if (!line) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      line.classList.add("is-visible");
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          line.classList.add("is-visible");
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(line);
  }

  /* ----------------------------- COUNTER --------------------------------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count-to"));
    if (isNaN(target)) return;
    var duration = 1000;
    var start = null;
    var decimals = (el.getAttribute("data-count-decimals") | 0);
    var prefix = el.getAttribute("data-count-prefix") || "";
    var suffix = el.getAttribute("data-count-suffix") || "";

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var value = target * eased;
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function initCounters() {
    var counters = document.querySelectorAll("[data-count-to]");
    if (!counters.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        var prefix = el.getAttribute("data-count-prefix") || "";
        var suffix = el.getAttribute("data-count-suffix") || "";
        var decimals = (el.getAttribute("data-count-decimals") | 0);
        el.textContent = prefix + parseFloat(el.getAttribute("data-count-to")).toFixed(decimals) + suffix;
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ----------------------------- COST CALCULATOR ------------------------- */
  function initCostCalc() {
    var root = document.getElementById("costCalc");
    if (!root) return;

    var freq = document.getElementById("costFreq");
    var mins = document.getElementById("costMin");
    var rate = document.getElementById("costRate");
    var people = document.getElementById("costPeople");
    var out = document.getElementById("costResult");
    if (!freq || !mins || !rate || !people || !out) return;

    var WEEKS = 48;
    var inputs = [freq, mins, rate, people];

    function update() {
      var f = parseFloat(freq.value) || 0;
      var m = parseFloat(mins.value) || 0;
      var r = parseFloat(rate.value) || 0;
      var p = parseFloat(people.value) || 0;
      var annual = f * (m / 60) * r * p * WEEKS;
      var value = Math.round(annual);
      out.textContent = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value) + " €";
    }

    inputs.forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    update();
  }

  /* ----------------------------- SERVICES ACCORDION ---------------------- */
  function initServices() {
    var services = document.querySelectorAll(".service");
    if (!services.length) return;

    services.forEach(function (service) {
      service.setAttribute("role", "button");
      service.setAttribute("tabindex", "0");
      service.setAttribute("aria-expanded", "false");

      var toggle = function () {
        var isOpen = service.classList.contains("is-open");
        services.forEach(function (other) {
          other.classList.remove("is-open");
          other.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          service.classList.add("is-open");
          service.setAttribute("aria-expanded", "true");
        }
      };

      service.addEventListener("click", toggle);
      service.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ----------------------------- LEADS CONFIG ---------------------------- */
  var CONFIG = {
    supabaseUrl: "https://osyvnsviqvnibivcyibj.supabase.co",
    supabaseKey: "sb_publishable_vZq26_h5JkxogoD4ipyXKg_cDfZWTf_",
    notifyEmail: "ludusopsadmin@gmail.com",
    // Rellenar cuando exista la cuenta. Ej.: "https://cal.com/ludus-ops/15min"
    calendlyUrl: "",
    // Rellenar cuando exista la cuenta de Plausible. Ej.: "ludusops.com"
    plausibleDomain: "",
    // Página de empresa de LinkedIn. Confirma o cambia esta URL.
    linkedinUrl: "https://www.linkedin.com/company/ludus-ops/",
    phone: "+34 625 369 929"
  };

  /* ----------------------------- TRACKING -------------------------------- */
  function track(name, data) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: name };
    if (data) Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
    window.dataLayer.push(payload);
    // Plausible (sin cookies). Solo se carga si hay consentimiento.
    if (typeof window.plausible === "function") {
      window.plausible(name, data ? { props: data } : undefined);
    }
  }

  /* ----------------------------- CONSENT (RGPD) -------------------------- */
  var CONSENT_KEY = "ludus-consent";

  function consentValue() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function loadAnalytics() {
    if (!CONFIG.plausibleDomain) return;
    if (document.getElementById("plausible-script")) return;
    var s = document.createElement("script");
    s.id = "plausible-script";
    s.defer = true;
    s.setAttribute("data-domain", CONFIG.plausibleDomain);
    s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
    if (value === "granted") loadAnalytics();
    document.dispatchEvent(new CustomEvent("ludus:consent", { detail: { value: value } }));
  }

  var CONSENT_CSS =
    ".consent{position:fixed;left:0;right:0;bottom:0;z-index:300;padding:16px var(--gutter,20px) calc(16px + env(safe-area-inset-bottom,0px));" +
    "background:rgba(10,14,18,.96);backdrop-filter:blur(12px);border-top:1px solid #25303A;color:#F5F7F8;" +
    "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;" +
    "transform:translateY(110%);transition:transform .4s cubic-bezier(.16,1,.3,1)}" +
    "[data-theme='light'] .consent{background:rgba(245,247,248,.97);border-top-color:#DCE2E8;color:#0A0E12}" +
    ".consent.is-open{transform:translateY(0)}" +
    ".consent__inner{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:16px;justify-content:space-between}" +
    ".consent__text{max-width:70ch;color:inherit;opacity:.85}" +
    ".consent__text a{color:#3B7BFA;text-decoration:underline;text-underline-offset:3px}" +
    ".consent__actions{display:flex;gap:10px;flex-wrap:wrap}" +
    ".consent__btn{min-height:44px;padding:0 20px;border-radius:6px;font:inherit;font-weight:600;cursor:pointer;border:1px solid transparent}" +
    ".consent__btn--accept{background:#2463E8;color:#fff}" +
    ".consent__btn--accept:hover{background:#3B7BFA}" +
    ".consent__btn--reject{background:transparent;color:inherit;border-color:#33414D}" +
    ".consent__btn--reject:hover{border-color:#2463E8}" +
    ".consent__btn:focus-visible{outline:2px solid #3B7BFA;outline-offset:2px}" +
    "@media(max-width:768px){.consent__inner{flex-direction:column;align-items:stretch}.consent__actions{flex-direction:column}.consent__btn{width:100%}}";

  function initConsent() {
    var value = consentValue();
    if (value === "granted") { loadAnalytics(); return; }
    if (value === "denied") return;

    var style = document.createElement("style");
    style.textContent = CONSENT_CSS;
    document.head.appendChild(style);

    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", t("Aviso de cookies"));
    bar.innerHTML =
      '<div class="consent__inner">' +
        '<p class="consent__text">' +
          t("Usamos almacenamiento local necesario para recordar tus preferencias. Si lo aceptas, activamos una analítica sin cookies (Plausible) para saber qué páginas son útiles. Puedes aceptar o rechazar.") +
          ' <a href="cookies.html">' + t("Más información") + "</a>." +
        "</p>" +
        '<div class="consent__actions">' +
          '<button class="consent__btn consent__btn--reject" type="button" data-consent="denied">' + t("Rechazar") + "</button>" +
          '<button class="consent__btn consent__btn--accept" type="button" data-consent="granted">' + t("Aceptar") + "</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(bar);
    window.setTimeout(function () { bar.classList.add("is-open"); }, 400);

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (!btn) return;
      setConsent(btn.getAttribute("data-consent"));
      bar.classList.remove("is-open");
      window.setTimeout(function () { bar.remove(); }, 400);
    });
  }

  function initAttribution() {
    try {
      if (sessionStorage.getItem("ludus-attr")) return;
      var params = new URLSearchParams(window.location.search);
      sessionStorage.setItem("ludus-attr", JSON.stringify({
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        referrer: document.referrer || "",
        landing: window.location.pathname
      }));
    } catch (e) {}
  }

  function attribution() {
    var a = {};
    try { a = JSON.parse(sessionStorage.getItem("ludus-attr") || "{}"); } catch (e) {}
    return {
      page: window.location.pathname.split("/").pop() || "index.html",
      referrer: (a.referrer || "").slice(0, 500),
      utm_source: a.utm_source || "",
      utm_medium: a.utm_medium || "",
      utm_campaign: a.utm_campaign || "",
      lang: document.documentElement.getAttribute("lang") || "es"
    };
  }

  /* ----------------------------- LEADS API ------------------------------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function supabase(path, body) {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
    var headers = {
      "apikey": CONFIG.supabaseKey,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    };
    if (CONFIG.supabaseKey.indexOf("eyJ") === 0) headers.Authorization = "Bearer " + CONFIG.supabaseKey;
    return fetch(CONFIG.supabaseUrl.replace(/\/$/, "") + path, {
      method: "POST", headers: headers, body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error("supabase " + r.status); });
  }

  function notify(subject, data) {
    if (!CONFIG.notifyEmail) return null;
    var body = { _subject: subject, _template: "table", _captcha: "false" };
    if (data.email) body._replyto = data.email;
    Object.keys(data).forEach(function (k) { if (data[k]) body[k] = data[k]; });
    return fetch("https://formsubmit.co/ajax/" + CONFIG.notifyEmail, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error("notify " + r.status); });
  }

  function settle(tasks) {
    tasks = tasks.filter(Boolean);
    if (!tasks.length) return Promise.reject(new Error("sin canal configurado"));
    return Promise.allSettled(tasks).then(function (results) {
      var ok = results.some(function (r) { return r.status === "fulfilled"; });
      results.forEach(function (r) { if (r.status === "rejected") console.warn("[lead]", r.reason); });
      if (!ok) throw new Error("envío fallido");
    });
  }

  var LEAD_FIELDS = ["email", "problema", "nombre", "empresa", "cargo", "telefono", "sector", "empleados"];

  function createLead(data, stage, source) {
    var row = { id: data.id, stage: stage, source: source };
    LEAD_FIELDS.forEach(function (k) { if (data[k]) row[k] = data[k]; });
    var meta = attribution();
    Object.keys(meta).forEach(function (k) { if (meta[k]) row[k] = meta[k]; });
    var mail = {};
    Object.keys(row).forEach(function (k) { if (k !== "id") mail[k] = row[k]; });
    return settle([
      supabase("/rest/v1/leads", row),
      notify("Nuevo lead Ludus Ops — " + (data.empresa || data.email), mail)
    ]);
  }

  function completeLead(id, details, email) {
    var mail = { email: email };
    Object.keys(details).forEach(function (k) { mail[k] = details[k]; });
    return settle([
      supabase("/rest/v1/rpc/complete_lead", { p_id: id, p_details: details }),
      notify("Detalles del lead — " + (details.empresa || email), mail)
    ]);
  }

  /* ----------------------------- FORM HELPERS ---------------------------- */
  var RULES = {
    email: { required: true, email: true, message: "Introduce un email válido." },
    problema: { required: true, message: "Cuéntanos brevemente el problema." },
    privacidad: { required: true, message: "Acepta la política de privacidad para continuar." }
  };

  function fieldWrap(input) { return input.closest(".field"); }

  function setError(input, message) {
    var wrap = fieldWrap(input);
    if (!wrap) return;
    var error = wrap.querySelector(".field__error");
    wrap.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message || "";
  }

  function validate(input) {
    var rule = RULES[input.name];
    if (!rule) return true;
    var value = input.type === "checkbox" ? (input.checked ? "1" : "") : (input.value || "").trim();
    if (rule.required && !value) { setError(input, t(rule.message)); return false; }
    if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(input, t(rule.message)); return false;
    }
    setError(input, "");
    return true;
  }

  function validateForm(form) {
    var valid = true;
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      if (!validate(input)) valid = false;
    });
    if (!valid) {
      var first = form.querySelector(".has-error input, .has-error select, .has-error textarea");
      if (first) first.focus();
    }
    return valid;
  }

  function bindLiveValidation(form) {
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("blur", function () { if (input.type !== "checkbox") validate(input); });
      input.addEventListener("input", function () {
        if (fieldWrap(input) && fieldWrap(input).classList.contains("has-error")) validate(input);
      });
      input.addEventListener("change", function () {
        if (input.type === "checkbox") validate(input);
      });
    });
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === "string" ? value.trim() : value;
    });
    return data;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderSummary(el, data) {
    if (!el) return;
    var rows = [
      ["Empresa", data.empresa],
      ["Cargo", data.cargo],
      ["Email", data.email],
      ["Sector", data.sector],
      ["Empleados", data.empleados]
    ].filter(function (row) { return row[1]; });
    el.innerHTML = rows.map(function (row) {
      return '<div class="form__summary-row"><span class="form__summary-key">' +
        escapeHtml(t(row[0])) + '</span><span class="form__summary-val">' + escapeHtml(t(row[1])) + "</span></div>";
    }).join("");
  }

  function showSendError(form, show) {
    var box = form.querySelector(".form__error");
    if (!box) {
      box = document.createElement("p");
      box.className = "form__error";
      box.setAttribute("role", "alert");
      form.appendChild(box);
    }
    box.textContent = show ? t("No se ha podido enviar. Inténtalo de nuevo o escríbenos a ludusopsadmin@gmail.com.") : "";
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = t("Enviando…"); }
    else { btn.textContent = label || btn.dataset.label || btn.textContent; }
    btn.disabled = busy;
  }

  function showCalendly(link) {
    if (!link) return;
    if (CONFIG.calendlyUrl) { link.href = CONFIG.calendlyUrl; link.classList.remove("is-hidden"); }
  }

  /* ----------------------------- CONTACT PAGE FORM ----------------------- */
  function initForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var submitBtn = document.getElementById("submitBtn");
    var started = false;

    bindLiveValidation(form);
    form.addEventListener("focusin", function () {
      if (!started) { started = true; track("lead_form_start", { form: "contacto" }); }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showSendError(form, false);
      if (!validateForm(form)) return;

      var data = collect(form);
      if (data._honey) return;
      data.id = uuid();

      setBusy(submitBtn, true);
      createLead(data, "completo", "contacto").then(function () {
        track("lead_submit", { form: "contacto", sector: data.sector || "" });
        window.location.href = "gracias.html";
      }).catch(function () {
        track("lead_error", { form: "contacto" });
        setBusy(submitBtn, false);
        showSendError(form, true);
      });
    });
  }

  /* ----------------------------- THANK YOU PAGE -------------------------- */
  function initThankYou() {
    var cal = document.getElementById("graciasCal");
    if (cal) {
      showCalendly(cal);
      track("lead_thankyou", { page: "gracias" });
    }
    var homeCal = document.getElementById("homeCal");
    if (homeCal) showCalendly(homeCal);
  }

  /* ----------------------------- CHECKLIST (lead magnet) ----------------- */
  function initChecklist() {
    var printBtn = document.getElementById("checklistPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    var form = document.getElementById("checklistForm");
    if (!form) return;

    var success = document.getElementById("checklistSuccess");
    var submitBtn = document.getElementById("checklistSubmit");
    var started = false;

    bindLiveValidation(form);
    form.addEventListener("focusin", function () {
      if (!started) { started = true; track("checklist_form_start"); }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showSendError(form, false);
      if (!validateForm(form)) return;

      var data = collect(form);
      if (data._honey) return;
      data.id = uuid();
      data.problema = "Descarga de checklist: 10 señales de que tu operación pierde dinero.";

      setBusy(submitBtn, true);
      createLead(data, "completo", "checklist").then(function () {
        track("checklist_submit");
        form.classList.add("is-hidden");
        if (success) {
          success.classList.remove("is-hidden");
          success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        }
      }).catch(function () {
        track("checklist_error");
        setBusy(submitBtn, false);
        showSendError(form, true);
      });
    });
  }

  /* ----------------------------- DIAGNOSIS DRAWER ------------------------ */
  var SECTOR_OPTIONS =
    '<option value="">Selecciona un sector</option>' +
    '<option value="Industria">Industria</option>' +
    '<option value="Logística">Logística</option>' +
    '<option value="Ecommerce &amp; Retail">Ecommerce &amp; Retail</option>' +
    '<option value="Clínicas">Clínicas</option>' +
    '<option value="Servicios profesionales">Servicios profesionales</option>' +
    '<option value="Empresas en crecimiento">Empresas en crecimiento</option>' +
    '<option value="Otro">Otro</option>';

  var EMPLOYEE_OPTIONS =
    '<option value="">Selecciona un rango</option>' +
    '<option value="1-10">1–10</option>' +
    '<option value="11-50">11–50</option>' +
    '<option value="51-200">51–200</option>' +
    '<option value="201-500">201–500</option>' +
    '<option value="500+">Más de 500</option>';

  var DRAWER_HTML =
    '<div class="drawer__backdrop" data-drawer-close></div>' +
    '<aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">' +
      '<div class="drawer__top">' +
        '<p class="eyebrow drawer__eyebrow"><span>DIAGNÓSTICO</span> · <span data-step-label>PASO 1 DE 2</span></p>' +
        '<button class="drawer__close" type="button" data-drawer-close aria-label="Cerrar">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="drawer__progress" aria-hidden="true"><span></span></div>' +

      '<form class="form drawer__step" id="drawerStep1" novalidate>' +
        '<h2 class="drawer__title" id="drawerTitle">¿Qué te quita más tiempo o dinero cada semana?</h2>' +
        '<p class="drawer__text">Descríbelo en dos líneas. Te respondemos por email con el siguiente paso.</p>' +
        '<div class="field"><label for="dProblema">Tu respuesta <span class="req" aria-hidden="true">*</span></label>' +
          '<textarea id="dProblema" name="problema" rows="4" required aria-required="true" placeholder="Ej.: preparar los pedidos nos lleva el doble de lo que debería"></textarea>' +
          '<p class="field__error" role="alert"></p></div>' +
        '<div class="field"><label for="dEmail">Email de trabajo <span class="req" aria-hidden="true">*</span></label>' +
          '<input type="email" id="dEmail" name="email" autocomplete="email" required aria-required="true" />' +
          '<p class="field__error" role="alert"></p></div>' +
        '<input class="hp" type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<div class="field field--check"><label class="check"><input type="checkbox" name="privacidad" required aria-required="true" />' +
          '<span>Acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a>.</span></label>' +
          '<p class="field__error" role="alert"></p></div>' +
        '<button class="btn btn--primary btn--block" type="submit">Continuar →</button>' +
        '<p class="form__note">Sin compromiso. Presupuesto cerrado tras la primera llamada.</p>' +
      '</form>' +

      '<form class="form drawer__step is-hidden" id="drawerStep2" novalidate>' +
        '<h2 class="drawer__title">Recibido. Dos datos más y llegamos preparados.</h2>' +
        '<p class="drawer__text">Opcional. Nos ayuda a entrar en la primera llamada con contexto.</p>' +
        '<div class="form__grid">' +
          '<div class="field"><label for="dNombre">Nombre</label><input type="text" id="dNombre" name="nombre" autocomplete="name" /></div>' +
          '<div class="field"><label for="dEmpresa">Empresa</label><input type="text" id="dEmpresa" name="empresa" autocomplete="organization" /></div>' +
          '<div class="field"><label for="dCargo">Cargo</label><input type="text" id="dCargo" name="cargo" autocomplete="organization-title" /></div>' +
          '<div class="field"><label for="dTelefono">Teléfono</label><input type="tel" id="dTelefono" name="telefono" autocomplete="tel" /></div>' +
          '<div class="field"><label for="dSector">Sector</label><select id="dSector" name="sector">' + SECTOR_OPTIONS + '</select></div>' +
          '<div class="field"><label for="dEmpleados">Empleados</label><select id="dEmpleados" name="empleados">' + EMPLOYEE_OPTIONS + '</select></div>' +
        '</div>' +
        '<button class="btn btn--primary btn--block" type="submit">Enviar detalles →</button>' +
        '<button class="btn btn--ghost btn--block" type="button" data-skip>Omitir este paso</button>' +
      '</form>' +

      '<div class="drawer__step drawer__done is-hidden" id="drawerDone" role="status" aria-live="polite">' +
        '<p class="form__success-title">Solicitud enviada.</p>' +
        '<p class="form__success-text">Revisaremos lo que nos cuentas y te responderemos por email con el siguiente paso.</p>' +
        '<ul class="drawer__next">' +
          '<li><span>01</span><span>Revisamos tu solicitud</span></li>' +
          '<li><span>02</span><span>Conversación inicial</span></li>' +
          '<li><span>03</span><span>Presupuesto cerrado</span></li>' +
        '</ul>' +
        '<a class="btn btn--primary btn--block is-hidden" id="drawerCal" target="_blank" rel="noopener">Reservar la llamada ahora →</a>' +
        '<button class="btn btn--ghost btn--block" type="button" data-drawer-close>Cerrar</button>' +
      '</div>' +
    '</aside>';

  function initDrawer() {
    if (document.getElementById("contactForm")) return;
    if (document.body.hasAttribute("data-no-drawer")) return;

    var drawer = document.createElement("div");
    drawer.className = "drawer";
    drawer.id = "leadDrawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = DRAWER_HTML;
    document.body.appendChild(drawer);

    var bar = document.createElement("div");
    bar.className = "mobile-cta";
    bar.innerHTML = '<button class="btn btn--primary btn--block" type="button" data-drawer-open>Solicitar diagnóstico →</button>';
    document.body.appendChild(bar);
    document.body.classList.add("has-mobile-cta");

    if (window.LudusI18n && window.LudusI18n.lang() === "en") window.LudusI18n.apply("en");

    var panel = drawer.querySelector(".drawer__panel");
    var step1 = drawer.querySelector("#drawerStep1");
    var step2 = drawer.querySelector("#drawerStep2");
    var done = drawer.querySelector("#drawerDone");
    var stepLabel = drawer.querySelector("[data-step-label]");
    var progress = drawer.querySelector(".drawer__progress span");
    var lead = null;
    var state = 1;
    var lastFocus = null;
    var source = "";

    bindLiveValidation(step1);

    function go(n) {
      state = n;
      [step1, step2, done].forEach(function (el, i) { el.classList.toggle("is-hidden", i !== n - 1); });
      stepLabel.textContent = t(n === 3 ? "COMPLETADO" : "PASO " + n + " DE 2");
      progress.style.width = n === 1 ? "33%" : n === 2 ? "66%" : "100%";
      var focusEl = n === 1 ? step1.querySelector("textarea") : n === 2 ? step2.querySelector("input") : done.querySelector(".btn:not(.is-hidden)");
      if (focusEl) window.setTimeout(function () { focusEl.focus(); }, 60);
    }

    function open(from) {
      source = from || "cta";
      lastFocus = document.activeElement;
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("has-drawer");
      track("drawer_open", { source: source });
      go(state);
    }

    function close() {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("has-drawer");
      if (state === 1) track("drawer_abandon", { source: source });
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest('a.btn[href="contacto.html"], [data-drawer-open]');
      if (trigger && !drawer.contains(trigger)) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        var links = document.getElementById("navLinks");
        if (links) links.classList.remove("is-open");
        track("cta_click", { label: trigger.textContent.trim() });
        open(trigger.textContent.trim());
        return;
      }
      if (e.target.closest("[data-drawer-close]")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var focusables = Array.prototype.filter.call(
        panel.querySelectorAll("a[href], button, input, select, textarea"),
        function (el) { return !el.disabled && el.offsetParent !== null && !el.classList.contains("hp"); }
      );
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    step1.addEventListener("submit", function (e) {
      e.preventDefault();
      showSendError(step1, false);
      if (!validateForm(step1)) return;
      var data = collect(step1);
      if (data._honey) { go(3); return; }
      data.id = uuid();
      var btn = step1.querySelector('button[type="submit"]');
      setBusy(btn, true);
      createLead(data, "inicial", "panel").then(function () {
        lead = data;
        track("lead_submit", { form: "panel", step: 1, source: source });
        setBusy(btn, false);
        go(2);
      }).catch(function () {
        track("lead_error", { form: "panel", step: 1 });
        setBusy(btn, false);
        showSendError(step1, true);
      });
    });

    function finish() { showCalendly(drawer.querySelector("#drawerCal")); go(3); }

    step2.addEventListener("submit", function (e) {
      e.preventDefault();
      var details = collect(step2);
      var filled = Object.keys(details).some(function (k) { return details[k]; });
      if (!filled || !lead) { finish(); return; }
      var btn = step2.querySelector('button[type="submit"]');
      setBusy(btn, true);
      completeLead(lead.id, details, lead.email).then(function () {
        track("lead_submit", { form: "panel", step: 2, sector: details.sector || "" });
      }).catch(function () {
        track("lead_error", { form: "panel", step: 2 });
      }).then(function () {
        setBusy(btn, false);
        finish();
      });
    });

    step2.querySelector("[data-skip]").addEventListener("click", function () {
      track("lead_skip_details");
      finish();
    });

    var onScroll = function () {
      bar.classList.toggle("is-visible", window.scrollY > 320 && !drawer.classList.contains("is-open"));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----------------------------- PAGE TRANSITION ------------------------- */
  function initPageTransition() {
    if (reduceMotion) return;
    if (!document.startViewTransition) {
      document.addEventListener("click", function (e) {
        if (e.defaultPrevented) return;
        var link = e.target.closest("a");
        if (!link) return;
        var href = link.getAttribute("href");
        if (!href || link.target === "_blank" || href.charAt(0) === "#" ||
            href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0 ||
            href.indexOf("http") === 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        document.body.classList.add("is-fading");
        window.setTimeout(function () { window.location.href = href; }, 200);
      });
    }
  }

  /* ----------------------------- MISC ------------------------------------ */
  function initMisc() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------- SOCIAL LINKS ---------------------------- */
  var LINKEDIN_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
    '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9z"/></svg>';

  function initSocial() {
    if (!CONFIG.linkedinUrl) return;

    var legal = document.querySelector(".footer__legal");
    if (legal && !legal.querySelector("[data-linkedin]")) {
      var a = document.createElement("a");
      a.href = CONFIG.linkedinUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("data-linkedin", "");
      a.textContent = "LinkedIn";
      legal.appendChild(a);
    }

    var tools = document.querySelector(".nav__tools");
    if (tools && !tools.querySelector("[data-linkedin]")) {
      var b = document.createElement("a");
      b.className = "nav__tool";
      b.href = CONFIG.linkedinUrl;
      b.target = "_blank";
      b.rel = "noopener";
      b.setAttribute("data-linkedin", "");
      b.setAttribute("aria-label", "LinkedIn");
      b.innerHTML = LINKEDIN_ICON;
      tools.insertBefore(b, tools.firstChild);
    }
  }

  /* ----------------------------- PUBLIC API ------------------------------ */
  window.LudusLeads = {
    create: createLead,
    complete: completeLead,
    uuid: uuid,
    attribution: attribution,
    config: CONFIG
  };

  window.LudusConsent = {
    value: consentValue,
    set: setConsent,
    track: track
  };

  /* ----------------------------- BOOT ------------------------------------ */
  function boot() {
    initConsent();
    initAttribution();
    initTheme();
    initNav();
    initReveal();
    initMethodLine();
    initCounters();
    initCostCalc();
    initServices();
    initForm();
    initThankYou();
    initChecklist();
    initDrawer();
    initPageTransition();
    initMisc();
    initSocial();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
