import React from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "ready" | "no-session">(
    "idle"
  );
  const navigate = useNavigate();

  // Khi vào trang, Supabase sẽ tự exchange token từ URL (#access_token=...)
  // Nếu thành công -> đã có session tạm để gọi updateUser.
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? "ready" : "no-session");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (pw1.length < 6) return alert("Password phải từ 6 ký tự.");
    if (pw1 !== pw2) return alert("Password nhập lại không khớp.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      alert("Đặt lại mật khẩu thành công. Bạn đã được đăng nhập.");
      navigate("/my-dashboard");
    } catch (err: any) {
      alert(err?.message || "Không đặt lại được mật khẩu.");
      console.error("[reset password error]", err);
    } finally {
      setLoading(false);
    }
  }

  if (status === "idle") return null; // chớp kiểm tra session
  if (status === "no-session") {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "80px auto",
          padding: "0 16px",
          color: "#fff",
        }}
      >
        <h2>Reset Password</h2>
        <p>
          Liên kết đặt lại đã hết hạn hoặc không hợp lệ. Hãy quay lại{" "}
          <a href="/" style={{ textDecoration: "underline" }}>
            Sign In
          </a>{" "}
          và chọn <b>Forgot password</b> để nhận link mới.
        </p>
      </div>
    );
  }

  // status === "ready"
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: "0 16px",
        color: "#fff",
      }}
    >
      <h2>Reset Password</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="pw1">New Password</label>
        <input
          id="pw1"
          type="password"
          placeholder="Create a new password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          required
        />
        <label htmlFor="pw2">Confirm Password</label>
        <input
          id="pw2"
          type="password"
          placeholder="Re-enter password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
        />
        <button className="cta" type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
