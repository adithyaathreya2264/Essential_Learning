/** Every capability the assistant can dispatch to. */
export type ToolName = 'explain' | 'summarize' | 'quiz' | 'flashcards' | 'evaluate' | 'revise';

export type ToolDefinition = {
  name: ToolName;
  /** Shown to the model during intent classification. */
  description: string;
  /**
   * JSON Schema for the tool's *output*, used with constrained decoding.
   * Undefined for tools whose response is free-flowing prose.
   */
  outputSchema?: object;
  /** Whether this tool is wired to real generation logic yet. */
  implemented: boolean;
};
