export class AuthController {
  constructor(model, view, authStorage) {
    this.model = model;
    this.view = view;
    this.authStorage = authStorage;
  }

  async handleLogin(email, password) {
    // Cek input awal
    if (!email || !password) {
      this.view.renderError("Email dan password harus diisi.");
      return;
    }

    this.view.showLoading("Memverifikasi akun...");

    try {
      const token = await this.model.login({ email, password });

      if (typeof token !== "string" || token.trim().length === 0) {
        throw new Error("Token tidak valid.");
      }

      this.authStorage.save(token);

      this.view.renderSuccess("Login berhasil!");

      if (this.view.onLoggedIn) {
        this.view.onLoggedIn();
      }
    } catch (err) {
      console.error("[AuthController] Login gagal:", err);
      this.view.renderError(
        "Tidak dapat login. Periksa ulang email/password atau coba beberapa saat lagi."
      );
    }
  }

  async handleRegister(name, email, password) {
    if (!name || !email || !password) {
      this.view.renderError("Semua data wajib diisi untuk mendaftar.");
      return;
    }

    this.view.showLoading("Membuat akun baru...");

    try {
      const result = await this.model.register({ name, email, password });

      if (!result) {
        throw new Error("Registrasi gagal, server tidak memberikan hasil.");
      }

      this.view.renderSuccess("Akun berhasil dibuat. Silakan login.");

      if (this.view.onRegistered) {
        this.view.onRegistered();
      }
    } catch (err) {
      console.error("[AuthController] Register error:", err);
      this.view.renderError(
        "Akun gagal dibuat. Cek email atau gunakan password lebih kuat."
      );
    }
  }

  handleLogout() {
    try {
      this.authStorage.clear();
      this.view.renderSuccess("Berhasil keluar.");

      if (this.view.onLoggedOut) {
        this.view.onLoggedOut();
      }
    } catch (err) {
      console.error("[AuthController] Logout error:", err);
      this.view.renderError("Tidak dapat logout sekarang.");
    }
  }
}
