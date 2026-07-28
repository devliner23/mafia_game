import { useState } from "react";
import type { NewGameOptions } from "./sim";
import { useGame } from "./game/useGame";
import { loadGame } from "./save";
import { TitleScreen } from "./ui/screens/TitleScreen";
import { NewGameScreen } from "./ui/screens/NewGameScreen";
import { GameScreen } from "./ui/screens/GameScreen";
import { EndScreen } from "./ui/screens/EndScreen";
import "./ui/themes/theme.css";
import "./ui/themes/family.css";
import "./ui/themes/shell.css";

type Screen = "title" | "intake" | "playing";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [run, setRun] = useState<{ seed: string; options: NewGameOptions } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (screen === "intake") {
    return (
      <div className="shell">
        <NewGameScreen
          onBack={() => setScreen("title")}
          onBegin={(seed, options) => {
            setRun({ seed, options });
            setScreen("playing");
          }}
        />
      </div>
    );
  }

  if (screen === "title" || !run) {
    return (
      <div className="shell">
        <TitleScreen
          onNew={() => setScreen("intake")}
          onLoad={() =>
            void loadGame("autosave")
              .then((r) => {
                if (!r) return setError("No saved file yet.");
                setRun({ seed: r.seed, options: r.options });
                setScreen("playing");
              })
              .catch((e: Error) => setError(e.message))
          }
        />
        {error && <div className="notice" style={{ maxWidth: 620, margin: "12px auto" }}>{error}</div>}
      </div>
    );
  }

  return (
    <Run
      key={`${run.seed}:${run.options.name}`}
      seed={run.seed}
      options={run.options}
      onQuit={() => {
        setRun(null);
        setError(null);
        setScreen("title");
      }}
    />
  );
}

function Run({
  seed,
  options,
  onQuit,
}: {
  seed: string;
  options: NewGameOptions;
  onQuit: () => void;
}) {
  const game = useGame(seed, options);
  if (game.state.over) return <EndScreen state={game.state} onAgain={onQuit} />;
  return <GameScreen game={game} onQuit={onQuit} />;
}