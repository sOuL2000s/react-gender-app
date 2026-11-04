import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");

  const API_ENDPOINT =
    import.meta.env.VITE_API_URL || "http://localhost:8080/register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
      age: age ? Number(age) : "",
      gender,
    };

    setStatus("Sending...");
    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setStatus("Registration successful!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setAge("");
      setGender("");
    } catch (err) {
      console.error(err);
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
            The modern platform for building, deploying, and scaling your
            applications with confidence.
          </p>
          <ul className="brand-features">
            <li>✓ Enterprise-grade security</li>
            <li>✓ 99.9% uptime SLA</li>
            <li>✓ Global edge network</li>
          </ul>
        </div>

        <div className="auth-form-section">
          <div className="auth-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Start your journey with us today</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="field">
              <label>Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
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
            <div className="field">
              <label>Age</label>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                type="text"
                pattern="[0-9]*"
                required
              />
            </div>
            <div className="field">
              <label>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="auth-btn">
              Create Account
            </button>
          </form>
          {status && <p className="status">{status}</p>}
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
