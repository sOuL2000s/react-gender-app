import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Logging in...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus("Login successful!");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-branding">
          <div className="brand-logo">
            <div className="brand-icon">🚀</div>
            <div>Inovix Labs</div>
          </div>
          <p className="brand-tagline">
            Welcome back to the modern platform for building, deploying, and
            scaling your applications with confidence.
          </p>
          <ul className="brand-features">
            <li>✓ Enterprise-grade security</li>
            <li>✓ 99.9% uptime SLA</li>
            <li>✓ Global edge network</li>
          </ul>
        </div>

        <div className="auth-form-section">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="auth-btn">
              Sign In
            </button>
          </form>
          {status && <p className="status">{status}</p>}
          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
