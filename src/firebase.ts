import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, ChatMessage, ChatConversation } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the specific firestoreDatabaseId if configured, else default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as required by Firebase integration guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or reconnecting.');
    }
  }
}
testFirestoreConnection();

// Preset avatars for user profiles
export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

const LOCAL_STORAGE_USER_KEY = 'orbitto_active_uid';
const LEGACY_STORAGE_USER_KEY = 'chatflow_active_uid';

// Helper to update online status
export async function setUserPresence(uid: string, isOnline: boolean) {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status: isOnline ? 'online' : 'offline',
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Could not update user presence:', error);
  }
}

// Generate deterministic ID from email for fallback auth
export function getDeterministicUid(email: string): string {
  const clean = email.toLowerCase().trim();
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const positiveHash = Math.abs(hash).toString(36);
  const cleanPrefix = clean.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'user';
  return `u_${cleanPrefix}_${positiveHash}`;
}

// Safe password encoder for database verification fallback
function encodePass(pass: string): string {
  try {
    return btoa(unescape(encodeURIComponent(pass)));
  } catch {
    return pass;
  }
}

// User Registration: ONLY creates a new user, rejects if user already exists
export async function registerUser(
  email: string,
  pass: string,
  displayName: string,
  photoURL?: string,
  bio: string = 'Hey there! I am using Orbitto.'
): Promise<UserProfile> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = displayName.trim() || cleanEmail.split('@')[0] || 'User';
  const chosenPhoto = photoURL || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
  const uid = getDeterministicUid(cleanEmail);

  // 1. Check if user already exists in Firestore by deterministic UID
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    throw new Error('An account with this email already exists. Please switch to the Sign In tab.');
  }

  // 2. Also check if user exists by email query
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    throw new Error('An account with this email already exists. Please switch to the Sign In tab.');
  }

  // 3. Try Firebase Auth (optional background sync if enabled)
  const firebaseSafePass = pass.length < 6 ? (pass + '123456').slice(0, 6) : pass;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, firebaseSafePass);
    await updateProfile(userCredential.user, {
      displayName: cleanName,
      photoURL: chosenPhoto,
    }).catch(() => {});
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please switch to the Sign In tab.');
    }
    // For operation-not-allowed or others, fallback to anonymous session if available
    try {
      await signInAnonymously(auth);
    } catch {
      // ignore
    }
  }

  // 4. Create new profile doc in Firestore with stable deterministic UID
  const profile: UserProfile = {
    uid,
    displayName: cleanName,
    email: cleanEmail,
    photoURL: chosenPhoto,
    bio: bio.trim(),
    status: 'online',
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, {
    ...profile,
    _authCode: encodePass(pass),
  });

  localStorage.setItem(LOCAL_STORAGE_USER_KEY, uid);
  return profile;
}

// User Login: ONLY logs into an existing user, NEVER auto-creates a new user
export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.toLowerCase().trim();

  // Try background Firebase Auth if available
  const firebaseSafePass = pass.length < 6 ? (pass + '123456').slice(0, 6) : pass;
  try {
    await signInWithEmailAndPassword(auth, cleanEmail, firebaseSafePass);
  } catch {
    // If not working or disabled, try anonymous auth for rule checks
    try {
      await signInAnonymously(auth);
    } catch {
      // ignore
    }
  }

  // Look up user in Firestore
  const detUid = getDeterministicUid(cleanEmail);
  const userRef = doc(db, 'users', detUid);
  let snap = await getDoc(userRef);
  let matchedUid = detUid;

  // If not found by deterministic UID, query by email across users collection
  if (!snap.exists()) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      // DO NOT auto-create account on sign in!
      throw new Error('No account found with this email. Please switch to "Create Account" tab to register.');
    }

    const matchedDoc = querySnap.docs[0];
    snap = matchedDoc;
    matchedUid = matchedDoc.id;
  }

  const existingData = snap.data() as UserProfile & { _authCode?: string };

  // Password verification if credentials were saved
  if (existingData._authCode && existingData._authCode !== encodePass(pass)) {
    throw new Error('Incorrect password. Please verify your password and try again.');
  }

  // Update presence status to online
  await updateDoc(doc(db, 'users', matchedUid), {
    status: 'online',
    lastSeen: serverTimestamp(),
  }).catch(() => {});

  localStorage.setItem(LOCAL_STORAGE_USER_KEY, matchedUid);

  return {
    uid: matchedUid,
    displayName: existingData.displayName || cleanEmail.split('@')[0] || 'User',
    email: existingData.email || cleanEmail,
    photoURL: existingData.photoURL || DEFAULT_AVATARS[0],
    bio: existingData.bio || 'Hey there! I am using Orbitto.',
    status: 'online',
    lastSeen: existingData.lastSeen,
    createdAt: existingData.createdAt,
  };
}

// User Logout
export async function logoutUser(uid?: string) {
  const currentUid = uid || auth.currentUser?.uid || localStorage.getItem(LOCAL_STORAGE_USER_KEY) || localStorage.getItem(LEGACY_STORAGE_USER_KEY);
  if (currentUid) {
    try {
      await setUserPresence(currentUid, false);
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  localStorage.removeItem(LEGACY_STORAGE_USER_KEY);
  return signOut(auth).catch(() => {});
}

// Get saved user session on initial load
export async function getSavedSessionUser(): Promise<UserProfile | null> {
  const savedUid = localStorage.getItem(LOCAL_STORAGE_USER_KEY) || localStorage.getItem(LEGACY_STORAGE_USER_KEY);
  if (!savedUid) return null;

  try {
    const snap = await getDoc(doc(db, 'users', savedUid));
    if (snap.exists()) {
      await setUserPresence(savedUid, true);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, savedUid);
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Could not restore user session:', err);
  }
  return null;
}

// Update profile doc
export async function updateUserProfileDoc(
  uid: string,
  data: { displayName?: string; bio?: string; photoURL?: string }
) {
  const userRef = doc(db, 'users', uid);
  const cleanData: any = {};
  if (data.displayName !== undefined) cleanData.displayName = data.displayName;
  if (data.bio !== undefined) cleanData.bio = data.bio;
  if (data.photoURL !== undefined) cleanData.photoURL = data.photoURL;

  await updateDoc(userRef, cleanData);

  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, {
      displayName: cleanData.displayName || auth.currentUser.displayName,
      photoURL: cleanData.photoURL || auth.currentUser.photoURL,
    }).catch(() => {});
  }
}

// Search users by name or email
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(query(usersRef, limit(50)));
    const term = searchTerm.trim().toLowerCase();

    const results: UserProfile[] = [];
    snapshot.forEach((d) => {
      const user = d.data() as UserProfile;
      if (user.uid === currentUserId) return;
      if (!term) {
        results.push(user);
      } else {
        const nameMatch = user.displayName?.toLowerCase().includes(term);
        const emailMatch = user.email?.toLowerCase().includes(term);
        if (nameMatch || emailMatch) {
          results.push(user);
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Deterministic Chat ID for 1-to-1 conversations
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('___');
}

// Get or Create Conversation
export async function getOrCreateConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<ChatConversation> {
  const chatId = getChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatRef);

  if (snap.exists()) {
    const existing = snap.data() as ChatConversation;
    const updatePayload: any = {};
    if (
      existing.participantDetails?.[currentUser.uid]?.displayName !== currentUser.displayName ||
      existing.participantDetails?.[currentUser.uid]?.photoURL !== currentUser.photoURL
    ) {
      updatePayload[`participantDetails.${currentUser.uid}`] = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL || '',
        bio: currentUser.bio || '',
      };
    }
    if (
      existing.participantDetails?.[otherUser.uid]?.displayName !== otherUser.displayName ||
      existing.participantDetails?.[otherUser.uid]?.photoURL !== otherUser.photoURL
    ) {
      updatePayload[`participantDetails.${otherUser.uid}`] = {
        uid: otherUser.uid,
        displayName: otherUser.displayName,
        email: otherUser.email,
        photoURL: otherUser.photoURL || '',
        bio: otherUser.bio || '',
      };
    }
    if (Object.keys(updatePayload).length > 0) {
      await updateDoc(chatRef, updatePayload).catch(() => {});
    }
    return { ...existing, id: chatId };
  } else {
    const newChat: ChatConversation = {
      id: chatId,
      participants: [currentUser.uid, otherUser.uid],
      participantDetails: {
        [currentUser.uid]: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          bio: currentUser.bio || '',
        },
        [otherUser.uid]: {
          uid: otherUser.uid,
          displayName: otherUser.displayName || 'User',
          email: otherUser.email || '',
          photoURL: otherUser.photoURL || '',
          bio: otherUser.bio || '',
        },
      },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(chatRef, newChat);
    return newChat;
  }
}

// Send Message
export async function sendMessage(
  chatId: string,
  text: string,
  currentUser: UserProfile
) {
  if (!text.trim()) return;

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messageData = {
    chatId,
    senderId: currentUser.uid,
    senderName: currentUser.displayName,
    text: text.trim(),
    timestamp: serverTimestamp(),
    read: false,
  };

  const newDocRef = await addDoc(messagesRef, messageData);

  // Update chat document's lastMessage and updatedAt
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text: text.trim(),
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid],
    },
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  return newDocRef.id;
}

// Mark messages as read
export async function markChatMessagesAsRead(chatId: string, currentUserId: string) {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) return;
    const data = snap.data() as ChatConversation;

    if (data.lastMessage && !data.lastMessage.readBy?.includes(currentUserId)) {
      const readBy = [...(data.lastMessage.readBy || []), currentUserId];
      await updateDoc(chatRef, {
        'lastMessage.readBy': readBy,
      }).catch(() => {});
    }

    // Mark unread messages in subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const unreadQuery = query(messagesRef, where('read', '==', false), limit(25));
    const unreadSnap = await getDocs(unreadQuery);

    unreadSnap.forEach(async (d) => {
      const msg = d.data();
      if (msg.senderId !== currentUserId) {
        await updateDoc(d.ref, { read: true }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Error marking messages as read:', err);
  }
}

// Listen to all conversations for user
export function subscribeToUserChats(
  userId: string,
  callback: (chats: ChatConversation[]) => void
) {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatConversation[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as ChatConversation;
        list.push({ ...item, id: d.id });
      });
      // Sort in memory by updatedAt desc
      list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      console.error('Error listening to user chats:', error);
    }
  );
}

// Listen to messages of a single chat
export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) });
      });
      callback(msgs);
    },
    (error) => {
      console.error('Error subscribing to messages:', error);
    }
  );
}

// Listen to a specific user's live profile (online status & last seen)
export function subscribeToUserProfile(
  userId: string,
  callback: (user: UserProfile | null) => void
) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error listening to user profile:', error);
    }
  );
}
