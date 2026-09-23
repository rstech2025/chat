/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  setUserPresence,
  subscribeToUserChats,
  getOrCreateConversation,
  DEFAULT_AVATARS,
  logoutUser,
  getSavedSessionUser,
} from './firebase';
import { UserProfile, ChatConversation } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { NewChatModal } from './components/NewChatModal';
import { ProfileModal } from './components/ProfileModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Auth listener
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);

          let profile: UserProfile;
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          } else {
            profile = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              photoURL: user.photoURL || DEFAULT_AVATARS[0],
              bio: 'Hey there! I am using Orbitto.',
              status: 'online',
              lastSeen: serverTimestamp(),
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, profile);
          }

          if (mounted) {
            setCurrentUser(profile);
            await setUserPresence(user.uid, true);
          }
        } catch (err) {
          console.warn('Error fetching user profile:', err);
        }
      } else {
        // Fallback: check localStorage session
        try {
          const saved = await getSavedSessionUser();
          if (mounted && saved) {
            setCurrentUser(saved);
          } else if (mounted) {
            setCurrentUser(null);
            setActiveChatId(null);
          }
        } catch {
          if (mounted) {
            setCurrentUser(null);
            setActiveChatId(null);
          }
        }
      }

      if (mounted) {
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Presence lifecycle handlers (online/offline on focus, blur, unload)
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setUserPresence(currentUser.uid, true);
      } else {
        setUserPresence(currentUser.uid, false);
      }
    };

    const handleBeforeUnload = () => {
      setUserPresence(currentUser.uid, false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid]);

  // Real-time listener for current user's chats
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      return;
    }

    const unsubscribe = subscribeToUserChats(currentUser.uid, (chatList) => {
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Selected chat object
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const handleSelectChat = (chat: ChatConversation) => {
    setActiveChatId(chat.id);
  };

  const handleStartConversationWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    try {
      const chat = await getOrCreateConversation(currentUser, targetUser);
      setActiveChatId(chat.id);
      setShowNewChatModal(false);
    } catch (err) {
      console.error('Failed to create/open conversation:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser(currentUser?.uid);
      setCurrentUser(null);
      setActiveChatId(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-slate-400">Loading Orbitto...</p>
      </div>
    );
  }

  // If not logged in, show Auth Modal
  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4">
        <AuthModal onSuccess={(profile) => setCurrentUser(profile)} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar - Chat List & User Profile bar */}
      <Sidebar
        currentUser={currentUser}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onOpenNewChat={() => setShowNewChatModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
        isMobileChatActive={!!activeChat}
      />

      {/* Main Chat Area */}
      <ChatArea
        currentUser={currentUser}
        activeChat={activeChat}
        onBack={() => setActiveChatId(null)}
        onOpenNewChat={() => setShowNewChatModal(true)}
      />

      {/* "Start a Conversation" Modal */}
      {showNewChatModal && (
        <NewChatModal
          currentUser={currentUser}
          onClose={() => setShowNewChatModal(false)}
          onSelectUser={handleStartConversationWithUser}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updated) =>
            setCurrentUser((prev) => (prev ? { ...prev, ...updated } : prev))
          }
        />
      )}
    </div>
  );
}
