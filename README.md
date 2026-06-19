# LifeFeed

家族のライフログを共有するプレミアムなライフスタイルアプリ。
Vanilla HTML / CSS / JS + Firebase v10 modular SDK (Auth + Firestore) のみで構築。

## セットアップ

1. Firebase コンソールでプロジェクトを作成し、**Authentication（メール/パスワード）** と **Firestore** を有効化してください。
2. `scripts/firebase-config.js` の `firebaseConfig` を、あなたのプロジェクトの値に置き換えてください。
3. `/icons/icon-192.png` と `/icons/icon-512.png` を用意してください（PWAアイコン）。
4. 任意の静的ホスティング（Firebase Hosting / Vercel / Netlify など）にデプロイしてください。
   - ルートが `index.html` になるようにしてください（service worker のスコープはルート想定です）。

## Firestore データ構造

- `users/{uid}`: `{ name, icon, familyId, createdAt }`
- `families/{familyId}`: `{ name, inviteCode, memberIds[], createdAt }`
- `logs/{logId}`: `{ familyId, userId, userName, userIcon, categoryType, detailId, detailLabel, detailIcon, durationMinutes, createdAt }`
- `streaks/{uid_streakId}`: `{ count, lastChecked, userId, streakId }` (キャッシュ用)
- `support_requests/{id}`: `{ familyId, userId, userName, userIcon, type, label, createdAt }`

## 推奨 Firestore セキュリティルール

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isFamilyMember(familyId) {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyId == familyId;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /families/{familyId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isFamilyMember(familyId) || isSignedIn();
    }

    match /logs/{logId} {
      allow read: if isFamilyMember(resource.data.familyId);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    match /streaks/{streakId} {
      allow read, write: if isSignedIn() && streakId.matches(request.auth.uid + '_.*');
    }

    match /support_requests/{reqId} {
      allow read: if isFamilyMember(resource.data.familyId);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

## Firestore 複合インデックス

以下のクエリには複合インデックスが必要です（初回実行時にFirebaseがコンソールリンクを提示します）：

- `logs`: `familyId ==`, `createdAt >=`, `orderBy createdAt desc`
- `logs`: `userId ==`, `detailId ==`, `createdAt >=`, `createdAt <`
- `support_requests`: `familyId ==`, `orderBy createdAt desc`

## 設計思想

- 依存行動を責めるのではなく、「見える化」によって自然な気づきを促す
- 家族のリアルタイムフィードが、健全な習慣の可視化として機能する
- プレミアムなライフスタイルアプリとしての体験を最優先

## ファイル構成

```
/index.html
/styles/{reset,variables,layout,components,animations}.css
/scripts/{firebase-config,auth,app,feed,log,dashboard,streak,support,ui}.js
/data/categories.js
/manifest.json
/service-worker.js
```
