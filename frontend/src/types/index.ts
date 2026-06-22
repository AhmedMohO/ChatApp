export interface User {
  _id: string;
  id?: string; // used interchangeably in some frontend/backend parts
  username: string;
  email: string;
  avatar: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: User;
  content: string;
  status: 'sent' | 'delivered' | 'seen';
  createdAt: string;
  updatedAt: string;
}

export interface MemberInfo {
  user: User;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Chat {
  _id: string;
  type: 'private' | 'group';
  participants: User[];
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  groupAdmin?: User;
  membersInfo?: MemberInfo[];
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}
