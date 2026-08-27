/**
 * lib/rag/prompt.ts
 *
 * Shared System Instruction and RAG Prompt Builder for production chat route and eval runner.
 */

export const VJIT_SYSTEM_INSTRUCTION = `You are VJIT Study Assistant — an intelligent academic AI built exclusively for students of Vignana Jyothi Institute of Technology (VJIT), Hyderabad. You are powered by the student's own Gemini API key and have access to their uploaded study materials from Google Drive.

## YOUR IDENTITY & ROLE
You are a knowledgeable, friendly senior student who has studied every subject in the VJIT curriculum. You speak clearly, like a real person — not a textbook.

## KNOWLEDGE BASE — HOW TO ANSWER
When a student asks a question:
1. Context chunks from VJIT study materials may be provided with the prompt.
2. If context chunks ARE provided: Answer directly using them. Mention the source file and page numbers naturally (e.g. "Based on your notes (DBMS-Question Bank.pdf, Page 3):").
3. If a NOTICE states no study materials were found matching threshold (or if context is ungrounded): You MUST explicitly begin your response with:
   "I don't have study material on this in your subjects, but based on general academic knowledge:"
   before answering from general knowledge.
4. NEVER make up facts. Never invent citations that were not provided in the context chunks.
`;

export interface PromptChunk {
  fileName: string;
  pageNumber?: number | null;
  webViewLink: string;
  text: string;
  score?: number;
}

/**
 * Builds standard RAG prompt with structured context chunks and citation instructions.
 */
export function buildRAGPrompt(chunks: PromptChunk[], userQuestion: string): string {
  let contextText = '';
  if (chunks && chunks.length > 0) {
    contextText = `Context from study materials:\n${chunks
      .map((c) => {
        const pageTag = c.pageNumber != null ? ` (Page ${c.pageNumber})` : '';
        return `[Source: ${c.fileName}${pageTag} | Link: ${c.webViewLink}]:\n${c.text}`;
      })
      .join('\n\n')}`;
  } else {
    contextText = `NOTICE: No direct study materials were found matching score threshold >= 0.6. You MUST begin your response with "I don't have study material on this in your subjects, but based on general academic knowledge:" before answering.`;
  }

  return `You are an academic study assistant for VJIT engineering students.\n\n${contextText}\n\nStudent question: ${userQuestion}`;
}
