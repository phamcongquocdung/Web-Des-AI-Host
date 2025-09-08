import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./user-avatar.css"; // sử dụng file CSS riêng

export type UserAvatarMenuProps = {
  avatarUrl?: string;
  displayName?: string;
  email?: string;
  loginRoute?: string; // đường dẫn khi logout; mặc định "/" (trang home)
  onLogoutAPI?: () => Promise<void> | void; // nếu cần gọi API logout
};

export default function UserAvatarMenu({
  avatarUrl,
  displayName = "Guest",
  email,
  loginRoute = "/", // mặc định ra trang home
  onLogoutAPI,
}: UserAvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Đóng menu khi click ra ngoài hoặc bấm ESC
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  async function logout() {
    try {
      localStorage.removeItem("access_token");
      sessionStorage.clear();
      await onLogoutAPI?.();
    } finally {
      navigate(loginRoute, { replace: true }); // chuyển hướng về home
    }
  }

  return (
    <div className="ua-root">
      <button
        ref={btnRef}
        className="ua-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        title={displayName}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="ua-avatar" />
        ) : (
          <span className="ua-avatar ua-fallback">
            {displayName[0]?.toUpperCase() ?? "U"}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          className="ua-popover"
          role="menu"
          aria-label="User menu"
        >
          <div className="ua-header">
            <div className="ua-header-row">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="ua-avatar lg" />
              ) : (
                <span className="ua-avatar ua-fallback lg">
                  {displayName[0]?.toUpperCase() ?? "U"}
                </span>
              )}
              <div className="ua-user">
                <div className="ua-name">{displayName}</div>
                {email && <div className="ua-email">{email}</div>}
              </div>
            </div>
          </div>

          <div className="ua-section">
            <button
              className="ua-item"
              role="menuitem"
              onClick={() => navigate("/profile")}
            >
              My Profile
            </button>
            <button
              className="ua-item"
              role="menuitem"
              onClick={() => navigate("/settings")}
            >
              Settings
            </button>
            <div className="ua-row">
              <span className="ua-label">Language</span>
              <select
                className="ua-select"
                defaultValue="en"
                onChange={(e) => console.log("change lang", e.target.value)}
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </div>
          </div>

          {/* Refer a Friend (tùy chọn) */}
          <div className="ua-card">
            <div className="ua-card-title">Refer a Friend</div>
            <div className="ua-card-sub">
              Gift a free month and earn up to 3 free months!
            </div>
            <button className="ua-cta" onClick={() => navigate("/referral")}>
              Invite Now
            </button>
          </div>

          {/* Icon mạng xã hội (tùy chọn) */}
          <div className="ua-social">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X"
            >
              X
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              YT
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              IG
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              TT
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              in
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              GH
            </a>
          </div>

          <div className="ua-footer">
            <button className="ua-logout" role="menuitem" onClick={logout}>
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
