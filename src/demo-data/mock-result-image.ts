import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getMockResultImageDataUri(): string {
  const image = readFileSync(join(process.cwd(), "public", "ed-result-image-gpt-v1.jpg"));
  return `data:image/jpeg;base64,${image.toString("base64")}`;
}

export const mockResultImageAlt =
  "Synthetic stitched electronic medical record image generated for the demo.";
