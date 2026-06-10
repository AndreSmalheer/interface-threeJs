import "./LoadingScreen.css";

function LoadingScreen({ isVisible }) {
  return (
    <div className={`loading-screen ${!isVisible ? "hide" : ""}`}>
      <div className="loading-spinner">
        <div className="loading-dot" />
      </div>

      <span className="loading-text">Loading solar system</span>
    </div>
  );
}

export default LoadingScreen;
