export default function MethodNotes() {
  return (
    <section className="tl-notes">
      <div className="tl-notes-hd">METHOD NOTES</div>
      <p>
        <b>BPE</b> and <b>WordPiece</b> are subword tokenizers. They balance character-level flexibility with
        word-level efficiency. BPE merges frequent pairs iteratively (GPT-style). WordPiece uses greedy longest
        matches and marks continuations with <code>##</code> (BERT-style). This demo uses compact educational
        vocabularies, so splits are intentionally approximate.
      </p>
    </section>
  );
}
