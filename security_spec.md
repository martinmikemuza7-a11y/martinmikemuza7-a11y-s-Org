# Security Specification: StudyBuddy AI Cross-Device Cloud Sync

## 1. Data Invariants
1. **User Identity Isolation**: Every document, course, folder, documentItem, chunk, question, schedule, and session belongs to `/users/{userId}/*` and MUST have `request.auth.uid == userId`.
2. **Authenticated Access**: Unauthenticated requests are completely rejected (`request.auth != null`).
3. **No Cross-User Pollution**: A user on PC or phone can never read, list, create, update, or delete another user's courses or documents.
4. **Document ID Sanitization**: Path variable IDs must be valid alphanumeric strings of reasonable length (`<= 128`).
5. **No Blind Writes**: Incoming payloads must match their declared ownership (`incoming().userId == request.auth.uid`).

## 2. Dirty Dozen Test Payloads
1. **Unauthenticated Read on /users/{userId}/courses/{courseId}**: DENIED.
2. **Unauthenticated Write on /users/{userId}/documents/{docId}**: DENIED.
3. **User A reading User B's documents (`users/userB/documents/doc1`)**: DENIED.
4. **User A updating User B's course (`users/userB/courses/c1`)**: DENIED.
5. **User A deleting User B's questions (`users/userB/questions/q1`)**: DENIED.
6. **Injecting Malicious Jumbo Path ID (`users/{userId}/courses/{junkString_100kb}`)**: DENIED.
7. **Identity Spoofing on Create (`request.auth.uid == userA`, but payload `userId: userB`)**: DENIED.
8. **Direct write to unauthorized root collection (`/admin/{id}`)**: DENIED.
9. **Global catch-all document read (`/secret/{id}`)**: DENIED.
10. **Query listing all users' documents without owner filter**: DENIED.
11. **User A creating document with mismatched userId in payload**: DENIED.
12. **Tampering with immutable ownership field `userId` on update**: DENIED.

## 3. Test Runner Definition
Unit tests in `firestore.rules.test.ts` assert that all 12 payloads trigger PERMISSION_DENIED under the Zero-Trust policy.
