// scripts/firebase-config.js
// Central Firebase initialization. All other modules import `auth` and `db` from here.
// Replace the firebaseConfig values with your own project's config before deploying.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyB3JgDDDBDFms1mYMvrVdfBixkM8GrfXQg",
  authDomain: "life-feed-91e40.firebaseapp.com",
  projectId: "life-feed-91e40",
  storageBucket: "life-feed-91e40.firebasestorage.app",
  messagingSenderId: "227281483657",
  appId: "1:227281483657:web:8bf5c7648dd37223f79358",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline persistence + multi-tab support keeps reads low and works offline (PWA shell).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
