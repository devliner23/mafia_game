export function TitleScreen({ onNew, onLoad }: { onNew: () => void; onLoad: () => void }) {
  return (
    <div className="centre">
      <p className="eyebrow">A game about the people you trust</p>
      <h1 className="brand">
        Ear<em>ner</em>
      </h1>
      <p className="tag">
        Everyone in your crew wants your job. The higher you climb, the more of them there are.
      </p>
      <div className="row">
        <button className="primary" onClick={onNew}>Start a file</button>
        <button onClick={onLoad}>Open last file</button>
      </div>
    </div>
  );
}
