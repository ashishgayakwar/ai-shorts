// =====================================
// QUIZ LEVELS (Level 1, 2, 3 — 20 Q each)
// =====================================

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export const quizLevels = {
  level1: [] as QuizQuestion[],
  level2: [] as QuizQuestion[],
  level3: [] as QuizQuestion[],
};

// =============================
// LEVEL 1 — FOUNDATIONAL (20)
// =============================

quizLevels.level1 = [
  {
    id: 1,
    question: "What does tokenization mean in LLMs?",
    options: [
      "Breaking text into smaller units the model can process",
      "Encrypting text before training",
      "Splitting datasets into train/test groups",
      "Compressing model weights"
    ],
    correctIndex: 0,
    explanation:
      "Tokenization breaks raw text into small units (tokens) so the model can map them to embeddings and process them numerically."
  },
  {
    id: 2,
    question: "What are embeddings?",
    options: [
      "Text stored in a compressed file",
      "Dense numerical vectors representing meaning",
      "Encrypted user data",
      "Model-generated summaries"
    ],
    correctIndex: 1,
    explanation:
      "Embeddings are dense vectors where similar meanings end up close together, enabling semantic search and similarity."
  },
  {
    id: 3,
    question: "Why do LLMs use positional encoding?",
    options: [
      "To store model checkpoints",
      "To understand word order in a sequence",
      "To translate languages",
      "To speed up inference"
    ],
    correctIndex: 1,
    explanation:
      "Positional encodings let the model know where each token sits in the sequence so it can reason about order, not just content."
  },
  {
    id: 4,
    question: "Which component performs attention?",
    options: [
      "Feed-forward network",
      "Self-attention layers",
      "Embedding matrix",
      "Output projection layer"
    ],
    correctIndex: 1,
    explanation:
      "Self-attention layers compute how strongly each token should attend to every other token when building the next representation."
  },
  {
    id: 5,
    question: "What is a token?",
    options: [
      "A complete English word only",
      "Subword unit used by LLMs",
      "GPU memory chunk",
      "A cache artifact"
    ],
    correctIndex: 1,
    explanation:
      "A token is a subword unit (could be a word, part of a word, or punctuation) defined by the tokenizer for efficient modeling."
  },
  {
    id: 6,
    question: "What does temperature control?",
    options: [
      "Model training speed",
      "Randomness of output",
      "Context length",
      "GPU load"
    ],
    correctIndex: 1,
    explanation:
      "Temperature scales the logits before sampling: low values make outputs more deterministic, high values make them more random."
  },
  {
    id: 7,
    question: "What is a context window?",
    options: [
      "Token limit the model can attend to",
      "The model’s browser input",
      "A GPU batching method",
      "A temperature parameter"
    ],
    correctIndex: 0,
    explanation:
      "The context window is the maximum number of tokens the model can see and reason over in one request."
  },
  {
    id: 8,
    question: "Embeddings enable what type of search?",
    options: [
      "Keyword matching",
      "Semantic similarity search",
      "Password encryption",
      "GPU parallel search"
    ],
    correctIndex: 1,
    explanation:
      "By comparing embedding vectors, we can search based on meaning rather than exact keyword overlaps."
  },
  {
    id: 9,
    question: "Which is a primary symptom of hallucination?",
    options: [
      "Model refuses to answer",
      "Factual-sounding but made-up content",
      "Slow inference",
      "Repeated words in output"
    ],
    correctIndex: 1,
    explanation:
      "Hallucination is when the model confidently generates content that sounds right but is actually fabricated or wrong."
  },
  {
    id: 10,
    question: "Why do LLMs hallucinate?",
    options: [
      "They lack internet access",
      "They predict next tokens without factual grounding",
      "They have incorrect weights",
      "GPU overheating"
    ],
    correctIndex: 1,
    explanation:
      "LLMs are next-token predictors; if the prompt doesn’t contain reliable facts, they will still predict plausible continuations."
  },
  {
    id: 11,
    question: "What does RAG stand for?",
    options: [
      "Retrieval-Augmented Generation",
      "Random AI Generator",
      "Real-time API Gateway",
      "Reinforcement Adaptive Graph"
    ],
    correctIndex: 0,
    explanation:
      "RAG = Retrieval-Augmented Generation, where the model is given retrieved documents as extra grounded context before generating."
  },
  {
    id: 12,
    question: "What is the retrieval step responsible for in RAG?",
    options: [
      "Training the model",
      "Fetching relevant context from a knowledge base",
      "Running inference faster",
      "Tokenizing text"
    ],
    correctIndex: 1,
    explanation:
      "Retrieval finds the most relevant chunks from your knowledge store to feed into the prompt alongside the user query."
  },
  {
    id: 13,
    question: "What is cosine similarity used for?",
    options: [
      "Matching embeddings by angle/meaning",
      "Compressing vectors",
      "Encrypting data",
      "Measuring latency"
    ],
    correctIndex: 0,
    explanation:
      "Cosine similarity measures the angle between vectors and is commonly used to score how semantically similar two embeddings are."
  },
  {
    id: 14,
    question: "Which is a good sign of product usefulness?",
    options: [
      "High API usage",
      "High task completion rate",
      "Large context window",
      "Expensive infra"
    ],
    correctIndex: 1,
    explanation:
      "Task completion rate ties usage to actually getting user jobs done, not just generating more tokens."
  },
  {
    id: 15,
    question: "What does a vector database store?",
    options: [
      "User passwords",
      "Embedding vectors",
      "Model checkpoints",
      "Browser logs"
    ],
    correctIndex: 1,
    explanation:
      "A vector database stores embedding vectors (plus metadata) and supports fast similarity search over them."
  },
  {
    id: 16,
    question: "Attention helps the model:",
    options: [
      "Look at relevant tokens in the sequence",
      "Train faster",
      "Reduce costs",
      "Store user history"
    ],
    correctIndex: 0,
    explanation:
      "Attention lets each token weigh other tokens differently, focusing on the parts of the sequence that matter for the current step."
  },
  {
    id: 17,
    question: "Which is an example of semantic similarity?",
    options: [
      "Dog ≠ Cat because spelling differs",
      "‘Doctor’ and ‘physician’ are similar in meaning",
      "Sorting words alphabetically",
      "Counting word frequency"
    ],
    correctIndex: 1,
    explanation:
      "Semantic similarity cares about meaning, so ‘doctor’ and ‘physician’ are close even though the words are different."
  },
  {
    id: 18,
    question: "A PM evaluating an AI system should prioritize:",
    options: [
      "GPU type",
      "Accuracy + Reliability",
      "Number of embeddings",
      "Chat window size"
    ],
    correctIndex: 1,
    explanation:
      "From a product lens, users care whether the system is accurate and consistently reliable more than the underlying hardware."
  },
  {
    id: 19,
    question: "Which reduces hallucination the MOST?",
    options: [
      "Bigger model",
      "Lower temperature",
      "Grounding via retrieval",
      "More emojis"
    ],
    correctIndex: 2,
    explanation:
      "Grounding the model with retrieved evidence anchors answers to real data, which is far more effective than just tweaking sampling."
  },
  {
    id: 20,
    question: "Which basic evaluation checks factuality?",
    options: [
      "BLEU",
      "Grounded accuracy",
      "Latency",
      "Chunk size"
    ],
    correctIndex: 1,
    explanation:
      "Grounded accuracy measures whether answers are supported by the retrieved or reference documents, i.e., factual correctness."
  }
];

// =============================
// LEVEL 2 — INTERMEDIATE (20)
// =============================

quizLevels.level2 = [
  {
    id: 21,
    question: "Which part of a RAG system determines WHAT to retrieve?",
    options: [
      "Generator",
      "Retriever",
      "Tokenizer",
      "Attention head"
    ],
    correctIndex: 1,
    explanation:
      "The retriever turns the query into an embedding and selects which documents or chunks to bring back for the model."
  },
  {
    id: 22,
    question: "What is chunking?",
    options: [
      "Splitting documents into fixed-size meaningful parts",
      "GPU parallel execution",
      "Data encryption",
      "Token compression"
    ],
    correctIndex: 0,
    explanation:
      "Chunking breaks long documents into smaller, coherent pieces that can fit into the context window and be retrieved independently."
  },
  {
    id: 23,
    question: "Why is chunk size important in RAG?",
    options: [
      "Too big causes hallucination; too small loses context",
      "Too small increases temperature",
      "It controls GPU selection",
      "Large chunks reduce tokenization"
    ],
    correctIndex: 0,
    explanation:
      "Oversized chunks overflow context and mix topics; tiny chunks lose meaning—both hurt retrieval quality and increase hallucinations."
  },
  {
    id: 24,
    question: "What do vector indexes (HNSW/IVF) optimize?",
    options: [
      "Tokenization speed",
      "Similarity search performance",
      "Model training speed",
      "Inference batching"
    ],
    correctIndex: 1,
    explanation:
      "Indexes like HNSW/IVF approximate nearest neighbours so semantic search stays fast even with millions of embeddings."
  },
  {
    id: 25,
    question: "Which is a PM metric for evaluating AI assistants?",
    options: [
      "Transformer layers",
      "Embeddings dimension",
      "Task success rate",
      "GPU model"
    ],
    correctIndex: 2,
    explanation:
      "Task success rate connects the assistant’s behaviour directly to whether users successfully complete their jobs."
  },
  {
    id: 26,
    question: "What is an example of retrieval failure?",
    options: [
      "Retriever surfaces irrelevant chunks",
      "LLM times out",
      "Temperature too high",
      "Tokenizer splits incorrectly"
    ],
    correctIndex: 0,
    explanation:
      "If retrieval brings back irrelevant or off-topic chunks, the model will generate answers from the wrong evidence."
  },
  {
    id: 27,
    question: "Which is a benefit of embeddings over keyword search?",
    options: [
      "Lower insertion time",
      "Finds semantically similar content",
      "Reduces storage cost",
      "Removes duplicates"
    ],
    correctIndex: 1,
    explanation:
      "Embeddings can match ‘refund policy’ with ‘money back conditions’ even when no keywords overlap."
  },
  {
    id: 28,
    question: "Why does a model sometimes ignore retrieved context?",
    options: [
      "Context window overflow",
      "GPU overheating",
      "Tokenizer mismatch",
      "Wrong API settings"
    ],
    correctIndex: 0,
    explanation:
      "If the prompt hits the context limit, earlier retrieved chunks may be truncated and the model never actually sees them."
  },
  {
    id: 29,
    question: "What is grounding?",
    options: [
      "Using retrieved facts to anchor the model response",
      "Reducing model size",
      "Vector quantization",
      "Embedding normalization"
    ],
    correctIndex: 0,
    explanation:
      "Grounding means conditioning the answer explicitly on retrieved, trusted data rather than just the model’s parametric memory."
  },
  {
    id: 30,
    question: "What is the advantage of Hybrid Search (BM25 + Vectors)?",
    options: [
      "Balances keyword precision + semantic recall",
      "Makes model smaller",
      "Reduces bill cost",
      "Improves token accuracy"
    ],
    correctIndex: 0,
    explanation:
      "Hybrid search combines exact term matches (BM25) with semantic similarity, catching both precise and fuzzy matches."
  },
  {
    id: 31,
    question: "As an AI PM, how do you measure hallucination reduction?",
    options: [
      "Lower latency",
      "Increase in grounded accuracy",
      "Higher GPU utilization",
      "Lower chunk size"
    ],
    correctIndex: 1,
    explanation:
      "Grounded accuracy directly measures whether answers are supported by retrieved docs, so improvements here reflect fewer hallucinations."
  },
  {
    id: 32,
    question: "Why is prompt formatting important in RAG?",
    options: [
      "LLMs ignore retrieval unless context is framed properly",
      "It speeds up inference",
      "It reduces cost",
      "It improves embeddings"
    ],
    correctIndex: 0,
    explanation:
      "If the prompt doesn’t clearly separate instructions, question and context, the model may under-use or misinterpret retrieved text."
  },
  {
    id: 33,
    question: "When does increasing context window NOT help?",
    options: [
      "When retrieval is poor",
      "When inference is slow",
      "When embeddings are wrong",
      "When chunks are small"
    ],
    correctIndex: 0,
    explanation:
      "A bigger window won’t fix bad retrieval—if you fetch the wrong docs, the model will still answer from the wrong information."
  },
  {
    id: 34,
    question: "Why do we embed queries and documents in the same space?",
    options: [
      "To compress data",
      "To match similarity meaningfully",
      "To encrypt data",
      "To save GPU memory"
    ],
    correctIndex: 1,
    explanation:
      "Putting queries and documents in the same vector space lets us compare them directly using similarity metrics like cosine."
  },
  {
    id: 35,
    question: "What makes RAG superior to fine-tuning for factual tasks?",
    options: [
      "Lower temperature",
      "Real-time access to updated data",
      "Bigger models",
      "Fewer tokens"
    ],
    correctIndex: 1,
    explanation:
      "RAG can always pull the latest facts from your knowledge base, while a fine-tuned model’s knowledge is frozen at train time."
  },
  {
    id: 36,
    question: "Why do LLMs forget earlier text in long prompts?",
    options: [
      "Temperature too low",
      "Attention distribution weakens over long context",
      "Embeddings mismatch",
      "Prompt was not chunked"
    ],
    correctIndex: 1,
    explanation:
      "Attention weights get spread over more tokens as context grows, so earlier parts may get very low attention and be ‘forgotten’."
  },
  {
    id: 37,
    question: "Which retrieval issue leads to hallucinated summaries?",
    options: [
      "Low recall in retriever",
      "High latency",
      "Token overflows",
      "Incorrect temperatures"
    ],
    correctIndex: 0,
    explanation:
      "If recall is low, key evidence never reaches the model, forcing it to invent details when summarising."
  },
  {
    id: 38,
    question: "Which PM metric is BEST for AI assistant reliability?",
    options: [
      "GPU speed",
      "Success + grounded accuracy",
      "Number of tokens generated",
      "Number of logs"
    ],
    correctIndex: 1,
    explanation:
      "Combining task success with grounded accuracy tells you if users are completing tasks with answers that are actually correct."
  },
  {
    id: 39,
    question: "Which is a common reason RAG output feels generic?",
    options: [
      "Retriever not specific enough",
      "High temperature",
      "Low chunk size",
      "Slow GPU"
    ],
    correctIndex: 0,
    explanation:
      "If retrieval brings broad, non-specific chunks, the model will answer in a generic way even if the question was precise."
  },
  {
    id: 40,
    question: "Hybrid RAG helps mainly with:",
    options: [
      "Combining keyword precision + semantic diversity",
      "Reducing model size",
      "Improving dataset quality",
      "Encrypting embeddings"
    ],
    correctIndex: 0,
    explanation:
      "Hybrid RAG uses both lexical and semantic match signals so you catch niche keyword matches and broader semantic matches together."
  }
];

// =============================
// LEVEL 3 — ADVANCED (20)
// =============================

quizLevels.level3 = [
  {
    id: 41,
    question: "Why can't LLMs ‘access memory’ like humans?",
    options: [
      "They are not trained enough",
      "They only compute next-token probabilities",
      "They store data on GPU",
      "They lack embeddings"
    ],
    correctIndex: 1,
    explanation:
      "LLMs don’t look up facts the way humans do; they just compute the next-token distribution from their weights and the prompt."
  },
  {
    id: 42,
    question: "Why does scaling model size eventually deliver diminishing returns?",
    options: [
      "Training instability",
      "Inference cost increases faster than quality",
      "Tokenization errors",
      "Poor attention masking"
    ],
    correctIndex: 1,
    explanation:
      "Beyond a point, each extra parameter yields small quality gains while cost, latency and infra complexity keep rising sharply."
  },
  {
    id: 43,
    question: "What is multi-query attention used for?",
    options: [
      "Faster inference with shared keys/values",
      "Increasing creativity",
      "Parallel training",
      "Reducing hallucination"
    ],
    correctIndex: 0,
    explanation:
      "Multi-query attention reuses keys and values across heads, reducing memory bandwidth and speeding up decoding."
  },
  {
    id: 44,
    question: "Why is Beam Search used?",
    options: [
      "To ensure deterministic high-quality text generation",
      "To reduce hallucination",
      "To speed up embedding queries",
      "To lower context usage"
    ],
    correctIndex: 0,
    explanation:
      "Beam search keeps multiple high-probability candidate sequences and picks the best, often improving output quality vs greedy sampling."
  },
  {
    id: 45,
    question: "What is the BEST way to reduce inference cost at scale?",
    options: [
      "Use larger models",
      "Use distillation, quantization, and caching",
      "Increase temperature",
      "Extend context window"
    ],
    correctIndex: 1,
    explanation:
      "Distilling to a smaller student, quantizing weights and caching frequent results cut tokens and compute without huge quality loss."
  },
  {
    id: 46,
    question: "What does quantization do?",
    options: [
      "Reduces vector length",
      "Compresses model weights to smaller precision",
      "Improves accuracy",
      "Increases creativity"
    ],
    correctIndex: 1,
    explanation:
      "Quantization stores weights in lower precision (e.g., 8-bit instead of 16/32-bit), shrinking memory footprint and speeding up compute."
  },
  {
    id: 47,
    question: "Why do some RAG systems use re-ranking?",
    options: [
      "To reorder candidate documents by semantic relevance",
      "To reduce token cost",
      "To increase GPU throughput",
      "To embed faster"
    ],
    correctIndex: 0,
    explanation:
      "Re-ranking lets a stronger model or scoring function reorder the top-k retrieved chunks so the very best evidence is shown first."
  },
  {
    id: 48,
    question: "What is the biggest governance challenge for AI PMs?",
    options: [
      "Deciding vector size",
      "Ensuring safety, fairness, and compliance",
      "Reducing latency",
      "Choosing a GPU"
    ],
    correctIndex: 1,
    explanation:
      "Beyond UX, AI PMs must ensure the system behaves safely, complies with regulations and doesn’t introduce unfair bias."
  },
  {
    id: 49,
    question: "Which is an example of prompt injection risk?",
    options: [
      "Too many tokens",
      "User instructs model to ignore previous instructions",
      "High temperature",
      "Wrong fine-tuning data"
    ],
    correctIndex: 1,
    explanation:
      "Prompt injection occurs when user content tricks the model into discarding system or developer instructions."
  },
  {
    id: 50,
    question: "Why is ‘chain of thought’ hidden by default?",
    options: [
      "It increases token cost",
      "It may reveal unstable intermediate reasoning",
      "It hurts creativity",
      "It slows down retrieval"
    ],
    correctIndex: 1,
    explanation:
      "Exposing raw step-by-step reasoning can surface flawed or sensitive intermediate steps, so it’s usually hidden or summarized."
  },
  {
    id: 51,
    question: "Which evaluation is closest to real product quality?",
    options: [
      "Offline perplexity",
      "Human preference evals",
      "BLEU score",
      "Context window size"
    ],
    correctIndex: 1,
    explanation:
      "Human preference or task-based evals measure how real users or experts rate outputs, which is closest to product reality."
  },
  {
    id: 52,
    question: "When should an AI PM choose Fine-tuning over RAG?",
    options: [
      "When tasks require new reasoning patterns",
      "When knowledge changes frequently",
      "When retrieval is slow",
      "Never"
    ],
    correctIndex: 0,
    explanation:
      "Fine-tuning is better when you need the model to learn new behaviours or styles, not just access more facts."
  },
  {
    id: 53,
    question: "Why is grounding insufficient by itself?",
    options: [
      "RAG is slow",
      "LLMs may ignore retrieved content",
      "Embedding vectors lose quality",
      "Documents are too long"
    ],
    correctIndex: 1,
    explanation:
      "Even with good retrieval, a poorly-designed prompt can cause the model to under-use or ignore the grounded context."
  },
  {
    id: 54,
    question: "Which technique reduces hallucination at inference time?",
    options: [
      "Open-ended prompting",
      "Constrained decoding",
      "Longer temperature",
      "More embeddings"
    ],
    correctIndex: 1,
    explanation:
      "Constrained decoding restricts what the model can output (e.g., valid JSON, allowed entities), limiting free-form hallucinations."
  },
  {
    id: 55,
    question: "Which PM metric shows deep value creation?",
    options: [
      "Daily queries",
      "Task success × Retention",
      "Context expansion",
      "GPU throughput"
    ],
    correctIndex: 1,
    explanation:
      "If users both succeed at tasks and keep coming back, the feature is solving real problems in a durable way."
  },
  {
    id: 56,
    question: "Why is latency critical in AI UX?",
    options: [
      "Users drop off if responses take > 3 seconds",
      "GPU usage increases",
      "Context shortens",
      "Embeddings degrade"
    ],
    correctIndex: 0,
    explanation:
      "Multiple studies show that even a few extra seconds of delay can spike abandonment for interactive products."
  },
  {
    id: 57,
    question: "What is the biggest risk of long context windows?",
    options: [
      "Higher hallucination risk due to diluted attention",
      "More storage cost",
      "Harder tokenization",
      "Ranking errors"
    ],
    correctIndex: 0,
    explanation:
      "Very long contexts can make attention diffuse and increase chances the model latches onto irrelevant parts of the prompt."
  },
  {
    id: 58,
    question: "Why do AI PMs care about evaluation consistency?",
    options: [
      "Model parameters change",
      "Prompt and retrieval variations can mask real improvements",
      "Embeddings drift",
      "GPU cycles reset"
    ],
    correctIndex: 1,
    explanation:
      "If you change prompts, datasets or scoring each time, you can’t tell whether a new model actually improved or not."
  },
  {
    id: 59,
    question: "Why is distillation valuable?",
    options: [
      "Makes models cheaper without losing much quality",
      "Improves embeddings",
      "Speeds up tokenization",
      "Reduces RAG complexity"
    ],
    correctIndex: 0,
    explanation:
      "Distillation transfers knowledge from a large teacher into a smaller student, preserving most quality at a much lower cost."
  },
  {
    id: 60,
    question: "What is the strongest signal your AI feature is trusted?",
    options: [
      "Model size increases",
      "Users repeatedly rely on it for critical tasks",
      "Higher API cost",
      "Longer prompts"
    ],
    correctIndex: 1,
    explanation:
      "When users use your AI feature for high-stakes, repeat tasks, it shows deep trust beyond just curiosity usage."
  }
];
