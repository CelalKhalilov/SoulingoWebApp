export interface LessonPlan {
  title: string;
  level: string;
  vocabulary: string[];
  sentences: string[];
  dialogue: Array<{ speaker: string; text: string }>;
  tips: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface VideoGenerationResult {
  uri: string;
  expiresAt?: string;
}
