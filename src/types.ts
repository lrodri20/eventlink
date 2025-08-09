export type EventDoc = {
    id: string;
    code: string;  // short human code to join, e.g., ALPHA123
    name: string;
    createdAt?: number;
};

export type Profile = {
    uid: string;
    displayName: string;
    bio?: string;
};

export type Attendee = Profile & {
    joinedAt: number;
    lastSeenMs?: number;
};

export type Poll = {
    id: string;
    question: string;
    options: { id: string; text: string }[];
    createdBy: string; // uid
    createdAt: number;
};

export type Vote = {
    optionId: string; // options[].id
    votedAt: number;
};
// src/types.ts
export type Chat = {
    id: string;              // matchId (e.g., "<uidA>_<uidB>" sorted)
    uids: [string, string];  // participants, sorted
    createdAt: number;       // ms since epoch
    lastMessage?: string;    // preview text
    lastMessageAt?: number;  // ms since epoch
};
export type ChatMessage = {
    id: string;      // doc id
    from: string;    // uid
    text: string;
    createdAt: number;
};
export type ChatWithPeer = Chat & {
    peerUid: string;     // the other user relative to auth.currentUser
    peerName?: string;   // looked up from attendees
};
