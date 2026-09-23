export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  status: 'online' | 'offline';
  lastSeen?: any;
  createdAt?: any;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  read: boolean;
}

export interface ChatParticipantInfo {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  participantDetails: Record<string, ChatParticipantInfo>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    readBy?: string[];
  };
  updatedAt: any;
  createdAt: any;
}
