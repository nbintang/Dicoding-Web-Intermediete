import { el, $ } from "../components/dom.js";

export class RegisterView {
  constructor(controller) {
    this.controller = controller;
    this.statusEl = null;
  }

  render() {
    const main = $("#main");
    main.innerHTML = "";

    const form = el("form", { class: "form", id: "regForm" }, [
      this._createInputField("Nama", "name", "text", "Nama lengkap Anda"),
      this._createInputField("Email", "email", "email", "nama@email.com"),
      this._createPasswordField(),
      el("div", { class: "kv" }, [
        el("button", { type: "submit", class: "button primary" }, "Buat Akun"),
        el("a", { href: "#/login", class: "button" }, "Sudah punya akun? Masuk"),
      ]),
      el("div", { id: "regStatus", "aria-live": "polite" }),
    ]);

    main.append(el("section", {}, [el("h2", {}, "Daftar"), form]));
    
    this.statusEl = $("#regStatus");

    $("#regForm").addEventListener("submit", (e) => this._onSubmit(e));
  }

  _createInputField(labelText, id, type, placeholder) {
    return el("div", {}, [
      el("label", { for: id }, labelText),
      el("input", { id, type, required: true, autocomplete: type === "email" ? "email" : "name", placeholder }),
    ]);
  }

  _createPasswordField() {
    return el("div", {}, [
      el("label", { for: "password" }, "Kata Sandi"),
      el("input", {
        id: "password",
        type: "password",
        required: true,
        minlength: 8,
        autocomplete: "new-password",
        placeholder: "Minimal 8 karakter",
      }),
      el("p", { class: "helper" }, "Minimal 8 karakter untuk keamanan akun."),
    ]);
  }

  _onSubmit(e) {
    e.preventDefault();
    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value.trim();
    this.controller.handleRegister(name, email, password);
  }

  showLoading(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
      this.statusEl.style.color = "gray";
      this.statusEl.style.fontStyle = "italic";
    }
  }

  renderError(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
      this.statusEl.style.color = "red";
      this.statusEl.style.fontWeight = "600";
    }
  }

  renderSuccess(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
      this.statusEl.style.color = "green";
      this.statusEl.style.fontWeight = "600";
    }
  }

  onRegistered() {
    location.hash = "#/login";
  }
}
