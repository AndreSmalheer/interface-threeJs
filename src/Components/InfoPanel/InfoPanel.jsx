import "./InfoPanel.css";

function InfoPanel({ info, onClose }) {
  return (
    <div className="info-panel" onClick={(e) => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose} aria-label="Close panel">
        ✕
      </button>

      <div className="info-header">
        <h2 className="info-title">{info.name}</h2>
      </div>

      <p className="info-description">{info.description}</p>

      <div className="info-facts">
        {info.facts.map((f) => (
          <div key={f.label} className="info-fact">
            <div>
              <div className="info-label">{f.label}</div>
              <div className="info-value">{f.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfoPanel;
