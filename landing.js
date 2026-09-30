/* ==========================================================================
   Ludus Ops — landing.js
   Formulario único de la landing. Envía el lead a Supabase y avisa por email
   usando la API compartida de script.js (window.LudusLeads).
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("landingForm");
  if (!form) return;

  var api = window.LudusLeads;
  var success = document.getElementById("landingSuccess");
  var errorBox = document.getElementById("landingError");
  var btn = document.getElementById("landingSubmit");
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var GENERIC = "No se ha podido enviar. Inténtalo de nuevo o escríbenos a ludusopsadmin@gmail.com.";

  var problema = form.querySelector("#problema");
  var email = form.querySelector("#email");
  var privacidad = form.querySelector('input[name="privacidad"]');

  function fail(message) {
    errorBox.textContent = message;
    var first = form.querySelector(".has-error");
    if (first) first.focus();
  }

  function mark(input, invalid) {
    if (input) input.classList.toggle("has-error", invalid);
    return invalid;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.textContent = "";

    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === "string" ? value.trim() : value;
    });

    if (data._honey) return;

    var invalid = false;
    invalid = mark(problema, !data.problema || data.problema.length < 3) || invalid;
    invalid = mark(email, !EMAIL.test(data.email || "")) || invalid;
    invalid = mark(privacidad, !data.privacidad) || invalid;

    if (invalid) {
      fail("Revisa los campos marcados. Necesitamos tu email para poder contactarte.");
      return;
    }

    if (!api) {
      fail(GENERIC);
      return;
    }

    data.id = api.uuid();
    btn.disabled = true;
    btn.textContent = "Enviando…";

    api.create(data, "completo", "landing").then(function () {
      window.location.href = "gracias.html";
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = "Quiero mi consulta gratuita →";
      fail(GENERIC);
    });
  });

  form.querySelectorAll("input, textarea").forEach(function (input) {
    input.addEventListener("input", function () { input.classList.remove("has-error"); });
    input.addEventListener("change", function () { input.classList.remove("has-error"); });
  });
})();
