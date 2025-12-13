export const basicConcepts = [
  {
    id: "b01",
    title: "What is Artificial Intelligence?",
    subtitle: "Computers doing tasks that usually need humans",
    blocks: [
      {
        type: "idea",
        text: [
          "Artificial Intelligence (AI) is when software can perform tasks that normally require human intelligence — like understanding language, recognizing patterns, or making decisions.",
          "AI systems don’t ‘think’ like humans. They learn patterns from data and use those patterns to generate outputs."
        ]
      },
      {
        type: "intuition",
        text: [
          "Think of AI as a pattern-finding machine: it becomes good at a task by seeing many examples."
        ]
      },
      {
        type: "example",
        title: "Everyday examples",
        text: [
          "Maps apps predicting traffic and suggesting routes.",
          "Shopping apps recommending items you might like.",
          "Camera apps recognizing faces or objects."
        ]
      },
      {
        type: "commonMistake",
        mistake: "AI means the computer is ‘smart’ like a human.",
        fix: "Most AI is specialized. It’s good at specific tasks, not general human reasoning."
      },
      {
        type: "takeaway",
        text: "AI is software that learns from data to assist or automate tasks in a human-like way."
      }
    ]
  },

  {
    id: "b02",
    title: "What is Machine Learning?",
    subtitle: "How AI learns from data",
    blocks: [
      {
        type: "idea",
        text: [
          "Machine Learning (ML) is a part of AI where systems learn from data instead of being explicitly programmed with rules.",
          "You don’t write all the logic. You give examples and the model learns patterns."
        ]
      },
      {
        type: "intuition",
        text: [
          "ML is like teaching by showing, not teaching by writing rules."
        ]
      },
      {
        type: "steps",
        title: "How ML usually works",
        steps: [
          "Collect examples (data).",
          "Train a model to learn patterns in that data.",
          "Use the model to make predictions on new inputs."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "A spam filter learns from labeled emails (spam / not spam) and then predicts for new emails."
        ]
      },
      {
        type: "takeaway",
        text: "ML is the most common method used to build modern AI capabilities."
      }
    ]
  },

  {
    id: "b03",
    title: "What is a Model?",
    subtitle: "The trained engine behind AI",
    blocks: [
      {
        type: "idea",
        text: [
          "A model is a trained system that takes an input and produces an output.",
          "Example: input text → output summary, input image → output label."
        ]
      },
      {
        type: "intuition",
        text: [
          "A model is like a trained ‘brain’ that has learned patterns from data."
        ]
      },
      {
        type: "example",
        title: "Model in product terms",
        text: [
          "When your app shows an AI answer, the model is the core engine producing that answer.",
          "Your UI, prompt, and rules wrap around the model."
        ]
      },
      {
        type: "commonMistake",
        mistake: "A model is the same as an app like ChatGPT.",
        fix: "ChatGPT is a product. The model is one component inside the product."
      },
      {
        type: "takeaway",
        text: "A model is the core AI component that turns inputs into outputs."
      }
    ]
  },

  {
    id: "b04",
    title: "Training vs Inference",
    subtitle: "Learning vs using what was learned",
    blocks: [
      {
        type: "idea",
        text: [
          "Training is when a model learns patterns from large datasets. It’s compute-heavy and done less often.",
          "Inference is when a trained model is used to generate outputs for users. This happens during product usage."
        ]
      },
      {
        type: "intuition",
        text: [
          "Training is studying. Inference is answering questions using what you studied."
        ]
      },
      {
        type: "example",
        title: "Product example",
        text: [
          "If your app summarizes a report, the summarization that happens when the user clicks ‘Summarize’ is inference.",
          "You likely are not retraining the model every time — you’re calling a trained model."
        ]
      },
      {
        type: "commonMistake",
        mistake: "To improve outputs, we must retrain the model.",
        fix: "Often you can improve results with better prompts, better input context, and better evaluation before retraining."
      },
      {
        type: "takeaway",
        text: "Most product work is inference-focused: UX, prompts, latency, cost, and quality."
      }
    ]
  },

  {
    id: "b05",
    title: "What is an LLM?",
    subtitle: "A model built for language",
    blocks: [
      {
        type: "idea",
        text: [
          "An LLM (Large Language Model) is trained on huge amounts of text so it can understand and generate language.",
          "It creates responses by predicting the next token repeatedly until it finishes the answer."
        ]
      },
      {
        type: "intuition",
        text: [
          "An LLM is like a very advanced autocomplete that learned from the internet and books."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "If you ask: ‘Explain tokens’, the model predicts the next tokens that form a coherent explanation.",
          "It doesn’t search by default — it generates."
        ]
      },
      {
        type: "commonMistake",
        mistake: "LLMs always know facts and are always correct.",
        fix: "LLMs generate likely text. They can be wrong unless you provide grounding or retrieval."
      },
      {
        type: "takeaway",
        text: "LLMs are language generators: powerful, but they need good context to be reliable."
      }
    ]
  },

  {
    id: "b06",
    title: "Tokens",
    subtitle: "How AI breaks text into pieces",
    blocks: [
      {
        type: "idea",
        text: [
          "LLMs do not read text as full words or sentences. They first break text into smaller pieces called tokens.",
          "The model processes tokens (not characters) and generates tokens as output."
        ]
      },
      {
        type: "intuition",
        text: [
          "Tokens are like LEGO blocks of text. The model builds sentences using these blocks."
        ]
      },
      {
        type: "example",
        title: "Simple examples",
        text: [
          "'apple' might be 1 token.",
          "'unbelievable' might be split into smaller pieces like 'un', 'believ', 'able'.",
          "Punctuation and numbers can also count as tokens."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Tokens = words.",
        fix: "Tokens can be parts of words. One word can be multiple tokens depending on how it’s split."
      },
      {
        type: "takeaway",
        text: "Token count affects cost, speed, and how much text the model can handle at once."
      }
    ]
  },

  {
    id: "b07",
    title: "What is a Prompt?",
    subtitle: "How you ask the model for results",
    blocks: [
      {
        type: "idea",
        text: [
          "A prompt is the instruction or question you give to the model.",
          "Prompts guide what the model should do, what context matters, and what format the answer should be in."
        ]
      },
      {
        type: "intuition",
        text: [
          "A prompt is like giving directions: clearer directions usually lead to better outcomes."
        ]
      },
      {
        type: "example",
        title: "Better vs worse prompt",
        text: [
          "Worse: ‘Summarize this.’",
          "Better: ‘Summarize in 5 bullets. Mention risks and next steps. Keep it under 120 words.’"
        ]
      },
      {
        type: "checklist",
        title: "A strong prompt often includes",
        bullets: [
          "Goal (what you want)",
          "Context (what the model should know)",
          "Constraints (length, tone, format)"
        ]
      },
      {
        type: "takeaway",
        text: "Prompt quality is one of the biggest levers you control in AI products."
      }
    ]
  },

  {
    id: "b08",
    title: "System Prompts",
    subtitle: "Setting behavior and boundaries",
    blocks: [
      {
        type: "idea",
        text: [
          "A system prompt is a hidden instruction that defines how the AI should behave: tone, rules, and boundaries.",
          "Users don’t see it, but it strongly influences outputs."
        ]
      },
      {
        type: "intuition",
        text: [
          "System prompts are like house rules that apply to every conversation."
        ]
      },
      {
        type: "example",
        title: "Example",
        text: [
          "‘You are a helpful assistant. Be concise. Ask clarifying questions when needed. Do not provide unsafe instructions.’"
        ]
      },
      {
        type: "commonMistake",
        mistake: "Only the user prompt matters.",
        fix: "System prompts often override or shape user requests to keep the experience consistent and safe."
      },
      {
        type: "takeaway",
        text: "System prompts are how products enforce consistent behavior across users."
      }
    ]
  },

  {
    id: "b09",
    title: "Context Window",
    subtitle: "How much the model can consider at once",
    blocks: [
      {
        type: "idea",
        text: [
          "The context window is the maximum amount of text (tokens) the model can use at one time to generate an answer.",
          "It includes your prompt, conversation history, and any retrieved content you add."
        ]
      },
      {
        type: "intuition",
        text: [
          "Think of it as the model’s ‘working memory’. If it’s too full, older information gets pushed out."
        ]
      },
      {
        type: "example",
        title: "Example",
        text: [
          "If a chat becomes very long, the model may stop remembering early details because they fall outside the context window."
        ]
      },
      {
        type: "commonMistake",
        mistake: "The model remembers everything in a conversation forever.",
        fix: "Once the context limit is exceeded, older text may be dropped or summarized."
      },
      {
        type: "takeaway",
        text: "Context limits impact long chats, long documents, and cost — plan around them."
      }
    ]
  },

  {
    id: "b10",
    title: "Why AI Makes Mistakes",
    subtitle: "It predicts text, not truth",
    blocks: [
      {
        type: "idea",
        text: [
          "LLMs generate answers by predicting likely text, not by verifying facts like a search engine.",
          "If the model lacks context, it may produce plausible guesses."
        ]
      },
      {
        type: "intuition",
        text: [
          "AI is great at sounding confident. Confidence is not the same as correctness."
        ]
      },
      {
        type: "example",
        title: "Example",
        text: [
          "If you ask about a niche policy or a very specific number without providing sources, the model may ‘fill in the gaps’."
        ]
      },
      {
        type: "commonMistake",
        mistake: "If the AI sounds sure, it must be right.",
        fix: "AI can be wrong even when it sounds confident. You need grounding, checks, or retrieval for critical facts."
      },
      {
        type: "takeaway",
        text: "To reduce errors, provide context, constrain outputs, and use evaluation and retrieval."
      }
    ]
  },

  {
    id: "b11",
    title: "Hallucinations",
    subtitle: "When AI invents believable details",
    blocks: [
      {
        type: "idea",
        text: [
          "A hallucination is when an AI generates information that sounds correct but is not actually grounded in real facts or provided context.",
          "It often happens when the model is missing information but still tries to answer."
        ]
      },
      {
        type: "intuition",
        text: [
          "Think of hallucinations as confident guessing when the model doesn’t know."
        ]
      },
      {
        type: "example",
        title: "Simple examples",
        text: [
          "Inventing a citation or paper title that doesn’t exist.",
          "Claiming a product feature exists when it wasn’t mentioned."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Hallucinations mean the model is ‘bad’ or ‘broken’.",
        fix: "Hallucinations are a normal failure mode when context is missing or prompts force certainty."
      },
      {
        type: "takeaway",
        text: "Reduce hallucinations by providing relevant context, using retrieval (RAG), and adding output checks."
      }
    ]
  },

  {
    id: "b12",
    title: "Temperature",
    subtitle: "Creativity vs consistency in outputs",
    blocks: [
      {
        type: "idea",
        text: [
          "Temperature controls how random the model’s outputs are.",
          "Lower temperature makes answers more predictable. Higher temperature increases variety and creativity."
        ]
      },
      {
        type: "intuition",
        text: [
          "Low temperature is like a careful, consistent assistant. High temperature is like a brainstorming partner."
        ]
      },
      {
        type: "example",
        title: "Where to use what",
        text: [
          "Customer support answers: low temperature for consistency.",
          "Creative naming ideas: higher temperature for variety."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Higher temperature always means ‘better’ answers.",
        fix: "Higher temperature increases randomness — it can reduce reliability in factual or sensitive use cases."
      },
      {
        type: "takeaway",
        text: "Most products keep temperature low for stable, repeatable outputs."
      }
    ]
  },

  {
    id: "b13",
    title: "Few-shot Examples",
    subtitle: "Teaching the model by showing examples",
    blocks: [
      {
        type: "idea",
        text: [
          "Few-shot prompting means including a few examples in your prompt to show the model the pattern you want.",
          "The model learns the style and format from your examples."
        ]
      },
      {
        type: "intuition",
        text: [
          "Examples act like a template: the model tries to follow what it sees."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "If you want structured output, show 2 sample inputs and their JSON outputs, then ask for a third."
        ]
      },
      {
        type: "commonMistake",
        mistake: "More examples are always better.",
        fix: "Too many examples can increase tokens and cost. Use just enough to show the pattern clearly."
      },
      {
        type: "takeaway",
        text: "Few-shot examples are one of the fastest ways to improve output formatting and consistency."
      }
    ]
  },

  {
    id: "b14",
    title: "Embeddings",
    subtitle: "Turning meaning into numbers",
    blocks: [
      {
        type: "idea",
        text: [
          "Embeddings convert text into a list of numbers (a vector) that represents meaning.",
          "Texts with similar meaning get embeddings that are close together."
        ]
      },
      {
        type: "intuition",
        text: [
          "Embeddings are like a ‘meaning fingerprint’ for text — similar ideas have similar fingerprints."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "‘cheap flights’ and ‘budget airfare’ have different words but similar meaning — embeddings help systems treat them as related."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Embeddings are just keywords stored as numbers.",
        fix: "Embeddings represent meaning and relationships, not exact words."
      },
      {
        type: "takeaway",
        text: "Embeddings power semantic search, recommendations, and retrieval-based AI."
      }
    ]
  },

  {
    id: "b15",
    title: "Semantic Search",
    subtitle: "Finding results based on meaning",
    blocks: [
      {
        type: "idea",
        text: [
          "Semantic search finds results based on what the user means, not just exact keyword matches.",
          "It helps users find the right content even when they phrase things differently."
        ]
      },
      {
        type: "intuition",
        text: [
          "Keyword search matches spelling. Semantic search matches intent."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "Searching for ‘refund policy’ can find a doc titled ‘How to get your money back’ even if the word ‘refund’ isn’t used."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Semantic search is just keyword search with more synonyms.",
        fix: "It often uses embeddings to match meaning, not just word overlap."
      },
      {
        type: "takeaway",
        text: "Semantic search makes products feel smarter because users get relevant answers with less effort."
      }
    ]
  },

  {
    id: "b16",
    title: "RAG",
    subtitle: "Giving the model the right info before it answers",
    blocks: [
      {
        type: "idea",
        text: [
          "RAG (Retrieval-Augmented Generation) retrieves relevant information and gives it to the model as context before it answers.",
          "This helps the model stay grounded in your data instead of guessing."
        ]
      },
      {
        type: "intuition",
        text: [
          "RAG is like an open-book exam: the model answers better when it has the right pages in front of it."
        ]
      },
      {
        type: "steps",
        title: "High-level flow",
        steps: [
          "User asks a question.",
          "System finds the most relevant text from your knowledge base.",
          "Model answers using that retrieved text."
        ]
      },
      {
        type: "commonMistake",
        mistake: "RAG guarantees zero hallucinations.",
        fix: "RAG reduces hallucinations, but you still need good retrieval, constraints, and evaluation."
      },
      {
        type: "takeaway",
        text: "Use RAG when accuracy matters and the answer should come from your own documents."
      }
    ]
  },

  {
    id: "b17",
    title: "Tool Calling",
    subtitle: "When AI uses actions (APIs) to get real answers",
    blocks: [
      {
        type: "idea",
        text: [
          "Tool calling allows the model to request an external action, like calling an API or querying a database.",
          "Instead of guessing, the model can fetch real information and then respond."
        ]
      },
      {
        type: "intuition",
        text: [
          "Tool calling turns AI from ‘talking’ into ‘doing’."
        ]
      },
      {
        type: "example",
        title: "Simple example",
        text: [
          "User: ‘What are my last 5 orders?’ → tool call to orders API → model summarizes results."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Tool calling means the model is always correct.",
        fix: "The tool can return wrong or incomplete data. You still need validation and error handling."
      },
      {
        type: "takeaway",
        text: "Tool calling is essential when answers must come from live systems, not memory."
      }
    ]
  },

  {
    id: "b18",
    title: "AI Agents",
    subtitle: "AI that can plan and complete tasks step-by-step",
    blocks: [
      {
        type: "idea",
        text: [
          "An AI agent is a system that can plan steps, use tools, and iterate to complete a goal — not just answer once.",
          "Agents are useful for multi-step tasks where the next action depends on the result of the previous step."
        ]
      },
      {
        type: "intuition",
        text: [
          "A chatbot answers questions. An agent tries to finish a task."
        ]
      },
      {
        type: "steps",
        title: "Typical agent loop",
        steps: [
          "Understand the goal.",
          "Plan the next step.",
          "Use a tool or take an action.",
          "Check results and continue until done."
        ]
      },
      {
        type: "commonMistake",
        mistake: "Agents are always better than normal chatbots.",
        fix: "Agents can be more complex, slower, and riskier. Use them only when multi-step execution is needed."
      },
      {
        type: "takeaway",
        text: "Use agents when a task requires planning + tools, not when a simple answer is enough."
      }
    ]
  },

  {
    id: "b19",
    title: "Evaluation",
    subtitle: "How you know your AI feature is good",
    blocks: [
      {
        type: "idea",
        text: [
          "Evaluation is how you measure the quality and reliability of your AI outputs.",
          "Without evaluation, you can’t confidently improve prompts, retrieval, or user experience."
        ]
      },
      {
        type: "intuition",
        text: [
          "If you can’t measure quality, you can’t improve it — and you won’t notice when it gets worse."
        ]
      },
      {
        type: "checklist",
        title: "Beginner evaluation methods",
        bullets: [
          "A small test set of questions and expected good answers",
          "Human review of outputs for correctness and usefulness",
          "User feedback signals (thumbs up/down, issue reports)"
        ]
      },
      {
        type: "commonMistake",
        mistake: "Evaluation is only needed at the end.",
        fix: "You should evaluate continuously because prompts, data, and user behavior change over time."
      },
      {
        type: "takeaway",
        text: "Evaluation is the safety net that keeps AI features reliable as they scale."
      }
    ]
  },

  {
    id: "b20",
    title: "AI Safety Basics",
    subtitle: "Keeping AI responsible and trustworthy",
    blocks: [
      {
        type: "idea",
        text: [
          "AI safety is about preventing harmful, biased, privacy-violating, or unsafe outputs while still being helpful.",
          "In products, safety is both a user trust issue and a business risk issue."
        ]
      },
      {
        type: "intuition",
        text: [
          "Safety is like guardrails on a highway: it prevents serious harm even when users drive unpredictably."
        ]
      },
      {
        type: "checklist",
        title: "Common safety measures",
        bullets: [
          "Refusal rules for unsafe requests",
          "PII protection (don’t leak personal data)",
          "Content moderation filters",
          "Logging and monitoring for risky outputs"
        ]
      },
      {
        type: "commonMistake",
        mistake: "Safety can be added later after launch.",
        fix: "Unsafe outputs can harm users and brand trust immediately — basic safety should exist from day one."
      },
      {
        type: "takeaway",
        text: "Safety is not optional. It is part of product quality for AI features."
      }
    ]
  }
];
