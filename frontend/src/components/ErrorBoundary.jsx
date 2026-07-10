import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h1 className="page-title">Something went wrong</h1>
            <p className="page-sub">
              The page hit an unexpected error. Refresh to try again, or contact
              the organizer if it keeps happening.
            </p>
            <pre className="error-boundary-detail">
              {this.state.error.message || String(this.state.error)}
            </pre>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
