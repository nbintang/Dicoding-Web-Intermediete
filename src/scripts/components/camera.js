// src/scripts/components/camera.js

export class CameraController {
  constructor(videoEl, canvasEl, captureBtn) {
    this.video = videoEl;
    this.canvas = canvasEl;
    this.button = captureBtn;

    this.stream = null;
    this.snapshotBlob = null;

    // simpan handler biar ga dobel
    this._handler = () => this.capture();
  }

  async start() {
    try {
      // minta akses kamera
      const permission = {
        video: { facingMode: "user" },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(permission);

      this.video.srcObject = this.stream;
      await this.video.play();

      // pastikan event listener cuma 1
      if (this.button) {
        this.button.removeEventListener("click", this._handler);
        this.button.addEventListener("click", this._handler);
      }

      console.log("[Camera] Kamera aktif.");
    } catch (error) {
      console.error("[Camera] Tidak bisa membuka kamera:", error);
      alert("Tidak dapat mengakses kamera. Cek izin browser kamu.");
    }
  }

  stop() {
    try {
      if (this.stream) {
        for (const track of this.stream.getTracks()) {
          track.stop();
        }
        this.stream = null;
      }

      if (this.video) this.video.srcObject = null;

      console.log("[Camera] Kamera dimatikan.");
    } catch (error) {
      console.error("[Camera] Gagal menghentikan kamera:", error);
    }
  }

  capture() {
    try {
      if (!this.video || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        alert("Kamera belum siap.");
        return;
      }

      const width = this.video.videoWidth;
      const height = this.video.videoHeight;

      if (!width || !height) {
        alert("Gambar tidak dapat diambil. Kamera belum menampilkan video.");
        return;
      }

      const ctx = this.canvas.getContext("2d");
      this.canvas.width = width;
      this.canvas.height = height;

      ctx.drawImage(this.video, 0, 0, width, height);

      this.canvas.toBlob(
        (blob) => {
          this.snapshotBlob = blob;
          console.log("[Camera] Foto berhasil ditangkap.");
        },
        "image/jpeg",
        0.92
      );
    } catch (error) {
      console.error("[Camera] Error saat capture:", error);
      alert("Gagal mengambil gambar.");
    }
  }

  getBlob() {
    return this.snapshotBlob;
  }
}
