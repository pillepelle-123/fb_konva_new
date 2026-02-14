export interface ConversationParticipant {
  id: number;
  name: string;
}

export interface Conversation {
  id: number;
  title: string | null;
  book_id: number | null;
  book_name: string | null;
  is_group: boolean;
  active: boolean;
  last_message: string | null;
  last_message_time: string | null;
  last_message_sender_id?: number | null;
  last_message_sender_name?: string | null;
  unread_count: number;
  participants: ConversationParticipant[] | null;
  direct_partner?: ConversationParticipant | null;
  muted?: boolean;
  archived?: boolean;
  blocked_by_other?: boolean;
}

