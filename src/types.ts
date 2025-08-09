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