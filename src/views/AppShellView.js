import { el, $ } from "../components/dom.js";
import { Auth } from  "../components/auth.js";

export class AppShellView {
  init() {
    const header = $("#app-header");

    if (!header.querySelector(".app-title")) {
      const titleWrap = el("div", { class: "app-title" });
      header.prepend(titleWrap);
    }

    this.renderNav();

    const footer = $("#app-footer");
    if (footer) {
      footer.textContent = `© ${new Date().getFullYear()} — Aplikasi Story.`;
    }
  }

  renderNav(active = location.hash || "#/stories") {
    const nav = $("#app-nav");
    const isLogin = Auth.isAuthed();

    nav.innerHTML = "";
    const links = [
      ["#/stories", "Stories"],
      ["#/add", "Tambah Story"],
      ["#/saved", "Tersimpan"],
      ...(isLogin
        ? [["#/logout", "Keluar"]]
        : [
            ["#/login", "Masuk"],
            ["#/register", "Daftar"],
          ]),
    ];

    const wrap = el("div", { class: "navbar", role: "menubar" });
    links.forEach(([href, label]) => {
      wrap.appendChild(
        el(
          "a",
          {
            href,
            role: "menuitem",
            "aria-current": active === href ? "page" : "false",
            title: label,
          },
          label
        )
      );
    });
    nav.appendChild(wrap);
  }
}
