import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smile,
  ArrowLeft,
  Check,
  CheckCheck,
  Search,
  X,
  MessageSquare,
  Sparkles,
  Phone,
  Video,
  Info,
} from 'lucide-react';
import { UserProfile, ChatConversation, ChatMessage } from '../types';
import {
  sendMessage,
  subscribeToMessages,
  subscribeToUserProfile,
  markChatMessagesAsRead,
} from '../firebase';
import {
  formatTime,
  formatLastSeen,
  formatMessageDateHeader,
} from '../utils/formatters';
import { FormattedMessageText } from './FormattedMessageText';

interface ChatAreaProps {
  currentUser: UserProfile;
  activeChat: ChatConversation | null;
  onBack: () => void;
  onOpenNewChat: () => void;
}

const COMMON_EMOJIS = ['😊', '👍', '❤️', '🔥', '😂', '👋', '🎉', '✨', '👏', '🚀', '🙌', '💯'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  activeChat,
  onBack,
  onOpenNewChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserLive, setOtherUserLive] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inChatSearch, setInChatSearch] = useState('');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Identify other participant
  const otherParticipantId = activeChat?.participants.find((p) => p !== currentUser.uid);
  const otherParticipantInitial = otherParticipantId
    ? activeChat?.participantDetails?.[otherParticipantId]
    : null;

  // Real-time listener for the other user's presence & profile
  useEffect(() => {
    if (!otherParticipantId) {
      setOtherUserLive(null);
      return;
    }
    const unsubscribe = subscribeToUserProfile(otherParticipantId, (user) => {
      setOtherUserLive(user);
    });
    return () => unsubscribe();
  }, [otherParticipantId]);

  // Real-time listener for messages in current chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(activeChat.id, (msgs) => {
      setMessages(msgs);
      // Mark as read
      markChatMessagesAsRead(activeChat.id, currentUser.uid);
    });

    return () => unsubscribe();
  }, [activeChat?.id, currentUser.uid]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setSending(true);

    try {
      await sendMessage(activeChat.id, textToSend, currentUser);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // If no chat selected, display welcome screen
  if (!activeChat || !otherParticipantId) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-950 p-8 text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Welcome to Orbitto
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
          Simple, secure, and instant real-time messaging powered by Firebase Firestore. Select a contact on the left or start a new conversation to begin.
        </p>
        <button
          onClick={onOpenNewChat}
          className="mt-6 py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-2xl shadow-lg shadow-emerald-500/20 text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start a Conversation</span>
        </button>
      </div>
    );
  }

  const otherName = otherUserLive?.displayName || otherParticipantInitial?.displayName || 'User';
  const otherAvatar =
    otherUserLive?.photoURL ||
    otherParticipantInitial?.photoURL ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  const otherStatus = otherUserLive?.status || 'offline';
  const otherLastSeen = otherUserLive?.lastSeen;
  const otherBio = otherUserLive?.bio || otherParticipantInitial?.bio || '';

  // Filter messages by search if active
  const filteredMessages = inChatSearch.trim()
    ? messages.filter((m) =>
        m.text.toLowerCase().includes(inChatSearch.trim().toLowerCase())
      )
    : messages;

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Chat Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar with Live Online Badge */}
          <div className="relative shrink-0 cursor-pointer" onClick={() => setShowInfoModal(true)}>
            <img
              src={otherAvatar}
              alt={otherName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 transition-colors ${
                otherStatus === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>

          {/* Contact Name & Live Status */}
          <div className="min-w-0 cursor-pointer" onClick={() => setShowInfoModal(true)}>
            <h2 className="text-sm font-bold text-slate-100 truncate hover:text-emerald-400 transition">
              {otherName}
            </h2>
            <p className="text-xs truncate flex items-center gap-1.5">
              {otherStatus === 'online' ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span className="text-slate-400">{formatLastSeen(otherStatus, otherLastSeen)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearchBox(!showSearchBox)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              showSearchBox ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Search in conversation"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Contact Info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* In-chat search bar */}
      {showSearchBox && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={inChatSearch}
            onChange={(e) => setInChatSearch(e.target.value)}
            placeholder="Search text in this chat..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {inChatSearch && (
            <span className="text-[11px] text-slate-400">
              {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            onClick={() => {
              setInChatSearch('');
              setShowSearchBox(false);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {inChatSearch ? 'No messages match search' : 'No messages yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {inChatSearch ? 'Try a different keyword' : `Say hello to ${otherName} to start chatting!`}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.uid;
            const prevMsg = filteredMessages[index - 1];

            // Show date separator if first message or day changed
            const showDateHeader =
              !prevMsg ||
              formatMessageDateHeader(msg.timestamp) !== formatMessageDateHeader(prevMsg.timestamp);

            return (
              <div key={msg.id} className="space-y-2">
                {showDateHeader && msg.timestamp && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400 rounded-full shadow-sm">
                      {formatMessageDateHeader(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isMe && (
                    <img
                      src={otherAvatar}
                      alt={otherName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                    />
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words relative transition-all ${
                      isMe
                        ? 'bg-emerald-600 text-slate-50 rounded-br-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    <FormattedMessageText text={msg.text} isMe={isMe} />
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMe ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{formatTime(msg.timestamp)}</span>
                      {isMe && (
                        <span>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-white inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 animate-in fade-in duration-150">
          <span className="text-xs text-slate-400 shrink-0 font-medium">Quick emojis:</span>
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(false)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Bar */}
      <footer className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              showEmojiPicker
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Emoji reaction"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 py-2.5 px-4 bg-slate-800/90 border border-slate-700/70 rounded-2xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5 stroke-[2.2]" />
          </button>
        </form>
      </footer>

      {/* Contact Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <div className="relative inline-block mb-3">
                <img
                  src={otherAvatar}
                  alt={otherName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-500/30 mx-auto"
                />
                <span
                  className={`absolute bottom-0 right-1 w-4 h-4 rounded-full ring-2 ring-slate-900 ${
                    otherStatus === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </div>

              <h3 className="text-lg font-bold text-slate-100">{otherName}</h3>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                {otherStatus === 'online' ? 'Online' : formatLastSeen(otherStatus, otherLastSeen)}
              </p>

              <div className="mt-4 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-left text-xs">
                <div className="text-slate-400 font-medium mb-1">About</div>
                <div className="text-slate-200">
                  <FormattedMessageText text={otherBio || 'Hey there! I am using Orbitto.'} isMe={false} />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
