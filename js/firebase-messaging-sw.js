importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDgpI9Qn8Z_gvz9lruhq5VmZ8frEUlNKN4",
  authDomain: "disaster-map-platform.firebaseapp.com",
  projectId: "disaster-map-platform",
  messagingSenderId: "741032743359",
  appId: "1:741032743359:web:bbe517d850e766e6ed910a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon.png"
  });
});