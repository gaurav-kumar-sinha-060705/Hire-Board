import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="panel panel-narrow" style={{ textAlign: "center", marginTop: 80 }}>
      <div className="eyebrow">Lost?</div>
      <h1 className="page-title" style={{ marginBottom: 8 }}>404</h1>
      <p className="page-sub" style={{ marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
      <Link className="btn" to="/">Back to home</Link>
    </div>
  );
}
