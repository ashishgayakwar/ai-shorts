export type VisualTopic = {
  id: string;
  title: string;
  heroImage: string;
  detailImage: string;
  summary: string;
  note?: string;
};

export const visualTopics: VisualTopic[] = [
  {
    id: "embeddings",
    title: "Embeddings & Vector Space",
    heroImage: "/visuals/embeddings-hero.png",
    detailImage: "/visuals/embeddings-detail.png",
    summary:
      "Embeddings convert text into numeric vectors where similar meanings lie closer together, enabling models to compare concepts, find related information, and capture semantic relationships efficiently.",
    note:
      "Vector distances indicate similarity. Shorter distances mean stronger relationships, powering search, recommendations, clustering, and semantic matching across large datasets."
  },
  {
    id: "tokenization",
    title: "Tokenization (BPE)",
    heroImage: "/visuals/tokenization-hero.png",
    detailImage: "/visuals/tokenization-detail.jpg",
    summary:
      "Tokenization breaks text into smaller subword units that the model processes. Tokens determine cost, context usage, and how effectively the model handles new, rare, or long words.",
    note:
      "Byte-Pair Encoding splits uncommon words into reusable chunks, improving vocabulary coverage and ensuring consistent behavior across unusual or domain-specific terms."
  },
  {
    id: "attention",
    title: "Attention Mechanism",
    heroImage: "/visuals/attention-hero.png",
    detailImage: "/visuals/attention-detail.png",
    summary:
      "Attention allows the model to focus on the most relevant words when predicting the next token, learning relationships automatically instead of treating all words equally.",
    note:
      "Attention weights reveal influence between tokens. Stronger weights show where the model ‘looks,’ enabling reasoning, context tracking, and long-range understanding."
  },
 {
  id: "ai-ml-dl-llm",
  title: "AI vs ML vs DL vs LLM",
  heroImage: "/visuals/ai-ml-dl-llm-hero.png",
  detailImage: "/visuals/ai-ml-dl-llm-detail.jpg",
  summary:
    "AI is the broad field of intelligent systems. ML is learning from data, DL uses neural networks, and LLMs are deep learning models specialized for language.",
  note:
    "Think hierarchy: AI → ML → DL → LLM. Each level becomes more specialized. LLMs excel at language tasks like reasoning, summarization, and conversation."
}
,
  {
    id: "pretrain-finetune",
    title: "Pre-training & Fine-tuning",
    heroImage: "/visuals/pretrain-hero.png",
    detailImage: "/visuals/pretrain-detail.png",
    summary:
      "Pre-training teaches language patterns using massive datasets, while fine-tuning specializes the model for specific tasks or domains, improving accuracy and alignment.",
    note:
      "Methods like LoRA and instruction tuning efficiently adjust model behavior without retraining, enabling customization for particular workflows or industries."
  },
  {
    id: "context-window",
    title: "Context Window",
    heroImage: "/visuals/context-window-hero.png",
    detailImage: "/visuals/context-window-detail.png",
    summary:
      "The context window limits how many tokens the model can consider at once. Exceeding this limit can cause truncation, summarization, or loss of important information.",
    note:
      "System prompts, history, instructions, and retrieved documents all share the same token budget. Managing length ensures responses remain grounded and accurate."
  },
  {
    id: "temperature",
    title: "Temperature & Sampling",
    heroImage: "/visuals/temperature-hero.png",
    detailImage: "/visuals/temperature-detail.png",
    summary:
      "Temperature controls randomness in generation. Low values produce focused, predictable text, while higher values encourage creative, varied, and sometimes riskier responses.",
    note:
      "Temperature combines with top-p or top-k sampling to shape output style, determinism, and diversity in generated text."
  },
  {
    id: "prompt-engineering",
    title: "Prompt Engineering",
    heroImage: "/visuals/prompt-engineering-hero.png",
    detailImage: "/visuals/prompt-engineering-detail.jpg",
    summary:
      "Prompt engineering structures instructions so the model understands tasks clearly. Well-designed prompts reduce errors, improve consistency, and enable more predictable behavior.",
    note:
      "Defining roles, adding examples, specifying constraints, and setting output formats significantly improve model reliability and usefulness."
  },
  {
    id: "rag",
    title: "RAG Architecture",
    heroImage: "/visuals/rag-hero.png",
    detailImage: "/visuals/rag-detail.png",
    summary:
      "RAG retrieves relevant documents and feeds them to the model, grounding responses in real data instead of relying solely on memorized knowledge.",
    note:
      "Chunking, embedding, and top-k retrieval settings shape accuracy and hallucination risk, keeping responses aligned with current information."
  },
  {
    id: "function-calling",
    title: "Function Calling & Tool Use",
    heroImage: "/visuals/function-calling-hero.jpg",
    detailImage: "/visuals/function-calling-detail.png",
    summary:
      "Function calling lets models invoke external tools like APIs or search. This transforms the LLM into an orchestrator capable of performing actions beyond text generation.",
    note:
      "The model selects functions, fills arguments, and incorporates results, enabling actions, transactions, and verifiable workflows inside natural conversations."
  }
];
