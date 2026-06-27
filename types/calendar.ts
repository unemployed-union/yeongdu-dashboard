export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

export type GoogleApiError = {
  code?: number;
  response?: {
    status?: number;
    data?: {
      error?: string;
      error_description?: string;
    };
  };
};