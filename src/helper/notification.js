
// ===== Push Notification Setup =====
const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

// Helper: Convert VAPID key untuk subscription
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe Push Notification ke Server
export async function subscribePushNotification(registration) {
  try {
    // ✅ CEK ONLINE DULU!
    if (!navigator.onLine) {
      console.log("[Push] Offline, skipping subscription");
      return;
    }

    const token = Auth.get();
    if (!token) {
      console.log("[Push] User not logged in, skipping subscription");
      return;
    }

    // Subscribe ke push notification
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Kirim subscription ke server
    const response = await fetch("https://story-api.dicoding.dev/v1/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth"))))
        }
      })
    });

    const result = await response.json();
    if (result.error) {
      console.error("[Push] Failed to subscribe:", result.message);
    } else {
      console.log("[Push] ✅ Successfully subscribed to push notifications");
    }
  } catch (error) {
    console.warn("[Push] Error subscribing (might be offline):", error.message);
  }
}


export async function unsubscribePushNotification(registration) {
  try {
    if (!registration) {
      console.log("[Push] No service worker registration available, skipping unsubscribe");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log("[Push] No push subscription found, nothing to unsubscribe");
      return;
    }

    const token = Auth.get();
    if (!token) {
      console.log("[Push] User not logged in, skipping server-side unsubscribe");
      // tetap coba unsubscribe di client
      try {
        await subscription.unsubscribe();
        console.log("[Push] Unsubscribed from push manager (client-side)");
      } catch (e) {
        console.warn("[Push] Failed to unsubscribe client-side:", e);
      }
      return;
    }

    // Kirim DELETE ke server sesuai spec API
    const response = await fetch("https://story-api.dicoding.dev/v1/notifications/subscribe", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    // server might return JSON
    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      console.warn("[Push] No JSON response from unsubscribe endpoint");
    }

    if (response.ok && result && result.error === false) {
      console.log("[Push] ✅ Successfully unsubscribed on server:", result.message);
    } else {
      console.warn("[Push] Server-side unsubscribe returned error or non-OK:", result);
    }

    // Unsubscribe di client (selalu coba)
    const unsub = await subscription.unsubscribe();
    console.log("[Push] Unsubscribe client-side result:", unsub);
  } catch (error) {
    console.warn("[Push] Error while unsubscribing:", error);
  }
}
