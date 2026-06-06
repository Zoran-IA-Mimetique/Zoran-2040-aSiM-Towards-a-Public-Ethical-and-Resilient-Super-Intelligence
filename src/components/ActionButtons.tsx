interface Props {
  onDone: () => void;
  onLater: () => void;
  onPause: () => void;
}

/** Trio d'actions FAIT / PLUS TARD / PAUSE (écran Aujourd'hui + notifications). */
export function ActionButtons({ onDone, onLater, onPause }: Props): JSX.Element {
  return (
    <div className="actions">
      <button type="button" className="btn btn--done" onClick={onDone}>
        FAIT
      </button>
      <button type="button" className="btn btn--later" onClick={onLater}>
        PLUS TARD
      </button>
      <button type="button" className="btn btn--pause" onClick={onPause}>
        PAUSE
      </button>
    </div>
  );
}
