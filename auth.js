// scripts/auth.js
// Handles Firebase Authentication plus the user/family document bootstrap.
// Exposes onAuthReady(callback) so app.js can react to login state changes.

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { generateInviteCode } from "./ui.js";

export let currentUser = null; // Firebase auth user
export let currentUserDoc = null; // Firestore users/{uid} data (includes familyId)

const AVATAR_ICONS = ["👨", "👩", "👦", "👧", "🧑", "👴", "👵"];
const googleProvider = new GoogleAuthProvider();

/** Sign up a new account with email/password + display name + avatar icon. */
export async function signUp(email, password, name, icon) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, "users", cred.user.uid);
  await setDoc(userRef, {
    name,
    icon: icon || AVATAR_ICONS[0],
    familyId: null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

/** Log in an existing account. */
export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Sign in (or sign up, transparently) with Google.
 * If this is the user's first time, create their users/{uid} profile doc.
 */
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const userRef = doc(db, "users", cred.user.uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      name: cred.user.displayName || "ユーザー",
      icon: AVATAR_ICONS[0],
      familyId: null,
      createdAt: serverTimestamp(),
    });
  }
  return cred.user;
}

/** Send a password reset email. */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/** Log out the current user. */
export async function logOut() {
  await signOut(auth);
}

/** Update the current user's display name and/or avatar icon. */
export async function updateUserProfile({ name, icon }) {
  if (!currentUser) throw new Error("ログインが必要です");
  const updates = {};
  if (name) updates.name = name;
  if (icon) updates.icon = icon;
  await setDoc(doc(db, "users", currentUser.uid), updates, { merge: true });
  currentUserDoc = { ...currentUserDoc, ...updates };
  return currentUserDoc;
}

/** Create a brand-new family room and attach the current user to it as a member. */
export async function createFamily(familyName) {
  if (!currentUser) throw new Error("ログインが必要です");
  const inviteCode = generateInviteCode();
  const familyRef = doc(collection(db, "families"));
  await setDoc(familyRef, {
    name: familyName,
    inviteCode,
    memberIds: [currentUser.uid],
    createdAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "users", currentUser.uid),
    { familyId: familyRef.id },
    { merge: true }
  );
  currentUserDoc = { ...currentUserDoc, familyId: familyRef.id };
  return { id: familyRef.id, inviteCode };
}

/** Join an existing family using its invite code. */
export async function joinFamilyByCode(inviteCode) {
  if (!currentUser) throw new Error("ログインが必要です");
  const familiesRef = collection(db, "families");
  const q = query(
    familiesRef,
    where("inviteCode", "==", inviteCode.trim().toUpperCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("招待コードが見つかりません");

  const familyDoc = snap.docs[0];
  const familyData = familyDoc.data();
  const updatedMembers = Array.from(new Set([...(familyData.memberIds || []), currentUser.uid]));

  await setDoc(doc(db, "families", familyDoc.id), { memberIds: updatedMembers }, { merge: true });
  await setDoc(doc(db, "users", currentUser.uid), { familyId: familyDoc.id }, { merge: true });
  currentUserDoc = { ...currentUserDoc, familyId: familyDoc.id };
  return { id: familyDoc.id, ...familyData };
}

/** Fetch the family document for a given familyId. */
export async function getFamily(familyId) {
  const snap = await getDoc(doc(db, "families", familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Subscribe to auth state. Calls `callback(user, userDoc)` whenever auth changes,
 * with userDoc being the Firestore profile (or null while signed out).
 */
export function onAuthReady(callback) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      const snap = await getDoc(doc(db, "users", user.uid));
      currentUserDoc = snap.exists() ? snap.data() : null;
    } else {
      currentUserDoc = null;
    }
    callback(currentUser, currentUserDoc);
  });
}

export { AVATAR_ICONS };
