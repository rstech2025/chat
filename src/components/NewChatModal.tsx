import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquarePlus, User, Loader2, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { searchUsers } from '../firebase';
import { formatLastSeen } from '../utils/formatters';

interface NewChatModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUser,
  onClose,
  onSelectUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const results = await searchUsers(searchTerm, currentUser.uid);
        if (isMounted) {
          setUsers(results);
        }
      } catch (err) {
        console.error('Error fetching users for new chat:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [searchTerm, currentUser.uid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Start a Conversation</h2>
              <p className="text-xs text-slate-400">Search users to begin chatting in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="py-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto min-h-[220px] divide-y divide-slate-800/60 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Finding contacts...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <User className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {searchTerm ? 'No users matching your query' : 'No other users yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Open another tab or incognito window, log in as Alice or Bob, and chat in real-time between both tabs!
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {users.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => onSelectUser(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800/80 transition-all text-left group cursor-pointer"
                >
                  {/* Avatar with status */}
                  <div className="relative shrink-0">
                    <img
                      src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={user.displayName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-emerald-500/50 transition"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                        user.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition">
                        {user.displayName}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {formatLastSeen(user.status, user.lastSeen)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {user.bio || user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Real-time instant messaging
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
