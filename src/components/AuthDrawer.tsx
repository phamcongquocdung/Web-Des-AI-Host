import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthDrawer } from "../context/AuthDrawerContext";
import { supabase } from "../lib/supabase";
import "./auth-drawer.css";

export default function AuthDrawer() {
  const { open, mode, close, switchMode } = useAuthDrawer();
  const navigate = useNavigate();

  // form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // helpers
  const [loading, setLoading] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (mode === null) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);
    setJustSignedUp(false);

    try {
      if (mode === "signin") {
        // ---- SIGN IN: email + password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        close();
        navigate("/my-dashboard");
      } else {
        // ---- SIGN UP: email + password (có confirm)
        if (password.length < 6) throw new Error("Password phải từ 6 ký tự.");
        if (password !== password2)
          throw new Error("Password nhập lại không khớp.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/my-dashboard",
          },
        });
        if (error) throw error;

        // Nếu tài khoản đã được confirm trước đó thì có thể Sign In luôn
        if (data?.user?.confirmed_at) {
          alert("Tài khoản đã xác nhận. Bạn có thể Sign In ngay.");
          switchMode("signin");
          return;
        }

        setJustSignedUp(true);
        alert("Đăng ký thành công. Hãy vào email để xác nhận rồi đăng nhập.");
      }
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.error_description ||
        "Authentication error. Please try again.";
      setErr(msg);
      alert(msg); // thông báo nhỏ, không thay đổi UI
      console.error("[auth error]", e);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const onForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) return alert("Nhập email trước khi khôi phục mật khẩu.");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      alert("Đã gửi link đặt lại mật khẩu tới email.");
    } catch (e: any) {
      const msg = e?.message || "Không gửi được email đặt lại mật khẩu.";
      setErr(msg);
      alert(msg);
    }
  };

  // Resend confirmation email (sau khi signup)
  async function resendConfirm() {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      alert("Đã gửi lại email xác nhận.");
    } catch (e: any) {
      const msg = e?.message || "Không gửi lại được email xác nhận.";
      setErr(msg);
      alert(msg);
    }
  }

  // OAuth
  const signInWithGoogle = async () => {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/my-dashboard" },
    });
    if (error) {
      const msg = error.message;
      setErr(msg);
      alert(msg);
      console.error("[google oauth error]", error);
    }
  };

  const signInWithGithub = async () => {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin + "/my-dashboard" },
    });
    if (error) {
      const msg = error.message;
      setErr(msg);
      alert(msg);
      console.error("[github oauth error]", error);
    }
  };

  return (
    <>
      {/* overlay */}
      <div
        aria-hidden
        className={`auth-overlay ${open ? "show" : ""}`}
        onClick={close}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signin" ? "Sign in" : "Sign up"}
        className={`auth-panel ${open ? "open" : ""}`}
      >
        <button className="close-btn" onClick={close} aria-label="Close">
          ✕
        </button>

        <h2 className="panel-title">DTL</h2>

        <form className="form" onSubmit={onSubmit}>
          {mode === "signup" ? (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              {/* 2 ô password – giữ style cũ */}
              <label htmlFor="su-pass">Password</label>
              <input
                id="su-pass"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <label htmlFor="su-pass2">Confirm Password</label>
              <input
                id="su-pass2"
                type="password"
                placeholder="Re-enter password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                disabled={loading}
              />

              <button className="cta" type="submit" disabled={loading}>
                {loading ? "Processing..." : "Create Account"}
              </button>

              {/* Gợi ý + Resend confirmation sau khi signup */}
              <p className="muted">
                Already have an account?{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => switchMode("signin")}
                  disabled={loading}
                >
                  Sign In
                </button>
              </p>
              {justSignedUp && (
                <p className="muted">
                  Không nhận được email?{" "}
                  <button
                    type="button"
                    className="link"
                    onClick={resendConfirm}
                    disabled={loading}
                  >
                    Gửi lại email xác nhận
                  </button>
                </p>
              )}
            </>
          ) : (
            <>
              <label htmlFor="signin-email">Email Address</label>
              <input
                id="signin-email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <div className="row-between">
                <a className="link" href="#" onClick={onForgotPassword}>
                  Forgot password?
                </a>
              </div>

              <button className="cta" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <p className="muted">
                <button
                  type="button"
                  className="link"
                  onClick={() => switchMode("signup")}
                  disabled={loading}
                >
                  Sign Up
                </button>{" "}
                to create a new account!
              </p>
            </>
          )}
        </form>

        <div className="or-sep">
          <span>or</span>
        </div>

        <div className="socials">
          <button
            className="social"
            onClick={signInWithGoogle}
            type="button"
            disabled={loading}
          >
            <img
              alt=""
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              width={18}
              height={18}
            />
            Sign in with Google
          </button>

          <button
            className="social"
            onClick={signInWithGithub}
            type="button"
            disabled={loading}
          >
            <img
              alt=""
              src="https://www.svgrepo.com/svg/512317/github-142"
              width={18}
              height={18}
            />
            Sign in with Github
          </button>
        </div>

        {/* Thông báo ẩn cho screen reader – không thay đổi layout */}
        <p style={{ position: "absolute", left: -9999 }} aria-live="polite">
          {err || ""}
        </p>
      </aside>
    </>
  );
}
