export type CreateFeedbackRequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  link?: string;
  rotated?: boolean;
};

export const initialCreateFeedbackRequestState: CreateFeedbackRequestState = {
  status: "idle"
};
