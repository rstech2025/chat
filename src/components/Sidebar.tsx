import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Search,
  LogOut,
  User,
  CheckCheck,
  Check,
  Sparkles,
  MessageSquare,
  Github,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, ChatConversation } from '../types';
import { formatChatListTime } from '../utils/formatters';

interface SidebarProps {
  currentUser: UserProfile;
  chats: ChatConversation[];
  activeChatId: string | null;
  onSelectChat: (chat: ChatConversation) => void;
  onOpenNewChat: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  isMobileChatActive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenProfile,
  onLogout,
  isMobileChatActive,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  // Filter conversations
  const filteredChats = chats.filter((chat) => {
    // Find the other participant
    const otherParticipantId = chat.participants.find((p) => p !== currentUser.uid);
    const otherInfo = otherParticipantId ? chat.participantDetails?.[otherParticipantId] : null;
    const name = otherInfo?.displayName || 'User';
    const lastMsg = chat.lastMessage?.text || '';

    const term = searchFilter.toLowerCase().trim();
    return name.toLowerCase().includes(term) || lastMsg.toLowerCase().includes(term);
  });

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 h-full ${
        isMobileChatActive ? 'hidden md:flex' : 'flex'
      }`}
    >
      {/* Top Header: Current User Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left group cursor-pointer hover:opacity-90 transition min-w-0"
          title="View profile & status"
        >
          <div className="relative shrink-0">
            <img
              src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-400 transition">
              {currentUser.displayName}
            </h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
              {currentUser.bio || 'Online'}
            </p>
          </div>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNewChat}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Start a conversation"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenProfile}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Profile settings"
          >
            <User className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Start a Conversation Banner / Quick Action */}
      <div className="p-3 border-b border-slate-800/80">
        <button
          onClick={onOpenNewChat}
          className="w-full py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/15 transition cursor-pointer active:scale-[0.99]"
        >
          <MessageSquarePlus className="w-4 h-4 stroke-[2.2]" />
          <span>Start a Conversation</span>
        </button>

        {/* Search / Filter input */}
        <div className="relative mt-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search chats or messages..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {searchFilter ? 'No conversations found' : 'No chats yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              {searchFilter
                ? 'Try a different search term or start a new chat.'
                : 'Click "Start a Conversation" above to message a user.'}
            </p>
            {!searchFilter && (
              <button
                onClick={onOpenNewChat}
                className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-400 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Find people to chat
              </button>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const otherParticipantId = chat.participants.find((p) => p !== currentUser.uid);
            const otherInfo = otherParticipantId ? chat.participantDetails?.[otherParticipantId] : null;
            const displayName = otherInfo?.displayName || 'User';
            const photoURL =
              otherInfo?.photoURL ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
            const isActive = activeChatId === chat.id;

            const isLastMessageFromMe = chat.lastMessage?.senderId === currentUser.uid;
            const isUnread =
              chat.lastMessage &&
              !isLastMessageFromMe &&
              !chat.lastMessage.readBy?.includes(currentUser.uid);

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 ring-1 ring-emerald-500/40'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800"
                  />
                  {/* Subtle online marker placeholder or live status */}
                </div>

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-emerald-400' : 'text-slate-200 group-hover:text-emerald-400'
                      }`}
                    >
                      {displayName}
                    </h3>
                    {chat.lastMessage?.timestamp && (
                      <span
                        className={`text-[11px] shrink-0 ml-2 ${
                          isUnread ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {formatChatListTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1 truncate">
                      {isLastMessageFromMe && (
                        <span className="shrink-0 text-slate-400">
                          {chat.lastMessage?.readBy && chat.lastMessage.readBy.length > 1 ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 inline" />
                          )}
                          <span className="text-slate-400">You: </span>
                        </span>
                      )}
                      <span className={`truncate ${isUnread ? 'font-semibold text-slate-200' : ''}`}>
                        {chat.lastMessage?.text || 'No messages yet'}
                      </span>
                    </div>

                    {isUnread && (
                      <span className="shrink-0 ml-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between px-4 bg-slate-900/50">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300">Orbitto</span>
          <span>•</span>
          <span>Real-time</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition py-1 px-2 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer"
          title="Open GitHub"
        >
          <Github className="w-3.5 h-3.5" />
          <span>GitHub</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </aside>
  );
};
