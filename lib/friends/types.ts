export interface FriendPerson { id: string; name: string }
export interface FriendsResponse {
  code: string;
  friends: FriendPerson[];
  incoming: FriendPerson[];
  outgoing: FriendPerson[];
}
export interface HeadToHeadResponse {
  friend: FriendPerson;
  summary: { played: number; wins: number; losses: number };
  games: { gameId: string; played: number; wins: number; losses: number }[];
  matches: { id: string; gameId: string; completedAt: string; won: boolean }[];
  nextCursor: string | null;
}
export type FriendAction = 'accept' | 'decline' | 'cancel' | 'remove';
export interface Friendship {
  _id: string;
  members: string[];
  requester: string;
  recipient: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  acceptedAt?: Date;
}
