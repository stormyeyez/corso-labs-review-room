export type ChatTextPart = {
  type: "text";
  text: string;
};

export type ChatImagePart = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

export type ChatContent = string | Array<ChatTextPart | ChatImagePart>;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: ChatContent;
};

export type ChatPayload = {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  response_format?: {
    type: "json_object";
  };
};

export type ProviderCallResult = {
  json: unknown;
  totalMs: number;
};

