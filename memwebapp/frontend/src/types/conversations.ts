
export interface DatabaseConversation {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  agent_id?: string | null;
  category: string;
  sentiment: string;
  satisfaction_score: number;
  duration: number;
  resolved: boolean;
  timestamp: string;
  messages?: ConversationMessage[];
  tags?: ConversationTag[];
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface ConversationTag {
  id: string;
  conversation_id: string;
  tag: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
}

export interface VoiceData {
  id: string;
  filename: string;
  created_at: string;
  processed: boolean | null;
  transcription: string | null;
  segments: TranscriptSegment[] | null;
}

export interface DishTvConversation {
  id: number;
  agent_id?: string;
  mobile_no?: number;
  direction?: string;
  conversation?: string;
  score?: number; // Score field (0-100 range)
  call_duration_in_sec?: number;
  created_at?: string;
  extension?: number;
  parsedConversation?: DishTvConversationSegment[];
}

export interface DishTvConversationSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export type DataSource = 'memoapp' | 'dishtv';
