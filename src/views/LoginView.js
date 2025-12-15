import { el, $ } from "../components/dom.js";

export class LoginView {
  constructor(controller) {
    this.controller = controller; 
  }

  render() {
    const main = document.getElementById("main");
    main.innerHTML = "";
    main.append(
      el("section", {}, [
        el("h2", {}, "Masuk"),
        el("form", { class: "form", id: "loginForm" }, [
          el("div", {}, [
            el("label", { for: "email" }, "Email"),
            el("input", {
              id: "email",
              type: "email",
              required: true,
              autocomplete: "email",
              placeholder: "nama@email.com",
            }),
          ]),
          el("div", {}, [
            el("label", { for: "password" }, "Kata Sandi"),
            el("input", {
              id: "password",
              type: "password",
              required: true,
              minlength: 8,
              autocomplete: "current-password",
              placeholder: "Masukkan kata sandi Anda",
            }),
            el("p", { class: "helper" }, "Minimal 8 karakter."),
          ]),
          el("div", { class: "kv" }, [
            el("button", { type: "submit", class: "button primary" }, "Masuk"),
            el("a", { href: "#/register", class: "button" }, "Buat Akun"),
          ]),
          el("div", { id: "loginStatus", "aria-live": "polite" }),
        ])
      ])
    );

    // ✅ event listener login
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#email").value.trim();
      const password = $("#password").value.trim();

      // 🔹 panggil controller baru
      this.controller.handleLogin(email, password);
    });
  }

  // ✅ fungsi dipanggil controller
  showLoading(text) {
    const status = $("#loginStatus");
    status.textContent = text;
    status.style.color = "gray";
  }

  renderError(text) {
    const status = $("#loginStatus");
    status.textContent = text;
    status.style.color = "red";
  }

  renderSuccess(text) {
    const status = $("#loginStatus");
    status.textContent = text;
    status.style.color = "green";
  }

  onLoggedIn() {
    // ✅ arahkan user setelah login berhasil
    location.hash = "#/stories";
  }
}
