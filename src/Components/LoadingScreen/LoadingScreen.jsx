import "./LoadingScreen.css";

function LoadingScreen({ isVisible }) {
  return (
    <div className={`loading-screen ${!isVisible ? "hide" : ""}`}>
      <div className="loading-spinner" />

      <span className="loading-text">Loading</span>
    </div>
  );
}

export default LoadingScreen;
