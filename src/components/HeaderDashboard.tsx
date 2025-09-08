import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./header.css";
import { useUpgrade } from "../context/UpgradeContext";
import UserAvatarMenu from "../components/UserAvatarMenu";

/** Đặt menu (position: fixed) theo nút và kẹp trong viewport – dùng cho menu rộng (Resources) */
function useFixedClampPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement>,
  menuRef: React.RefObject<HTMLDivElement>,
  opts: { margin?: number; gap?: number; maxWidth?: number } = {}
) {
  const { margin = 16, gap = 10, maxWidth = 980 } = opts;

  const place = () => {
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const b = btn.getBoundingClientRect();
    const vw = window.innerWidth;

    const width = Math.min(maxWidth, vw - margin * 2);
    menu.style.width = `${width}px`;

    const center = b.left + b.width / 2;
    let left = Math.round(center - width / 2);
    left = Math.max(margin, Math.min(left, vw - width - margin));
    const top = Math.round(b.bottom + gap);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  useLayoutEffect(() => {
    if (!open) return;
    const m = menuRef.current;
    if (!m) return;

    const prevVis = m.style.visibility;
    const prevDisp = m.style.display;
    m.style.visibility = "hidden";
    m.style.display = "block";
    place();
    m.style.visibility = prevVis || "";
    m.style.display = prevDisp || "";

    const on = () => place();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

/** Căn menu hẹp trong nav (absolute) – đủ cho Workspace */
function useSmartAlignInNav(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement>,
  menuRef: React.RefObject<HTMLDivElement>,
  margin = 12
) {
  useLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;

    menu.style.left = "";
    menu.style.right = "";

    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;

    if (rect.right > vw - margin) {
      menu.style.right = "0px";
      menu.style.left = "auto";
    }
    if (rect.left < margin) {
      menu.style.left = "0px";
      menu.style.right = "auto";
    }
  }, [open, triggerRef, menuRef, margin]);
}

export default function HeaderDashboard() {
  const { openModal } = useUpgrade();

  // Workspace (hẹp)
  const [openWS, setOpenWS] = useState(false);
  const wsBtnRef = useRef<HTMLButtonElement | null>(null);
  const wsMenuRef = useRef<HTMLDivElement | null>(null);

  // Resources (rộng)
  const [openRES, setOpenRES] = useState(false);
  const resBtnRef = useRef<HTMLButtonElement | null>(null);
  const resMenuRef = useRef<HTMLDivElement | null>(null);

  // Đóng khi click ra ngoài / ESC
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wsBtnRef.current?.contains(t) && !wsMenuRef.current?.contains(t))
        setOpenWS(false);
      if (!resBtnRef.current?.contains(t) && !resMenuRef.current?.contains(t))
        setOpenRES(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenWS(false);
        setOpenRES(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Canh vị trí
  useSmartAlignInNav(openWS, wsBtnRef, wsMenuRef);
  useFixedClampPosition(openRES, resBtnRef, resMenuRef, {
    margin: 16,
    gap: 10,
    maxWidth: 980,
  });

  return (
    <header className="header header--dash">
      <div className="header__left">
        <Link to="/dashboard" className="header__brand">
          DTL
        </Link>

        <nav className="header__nav">
          {/* WORKSPACE (dropdown 2 cột) */}
          <div className="mega">
            <button
              ref={wsBtnRef}
              className={`mega__trigger ${openWS ? "is-open" : ""}`}
              onClick={() => {
                setOpenWS((v) => !v);
                setOpenRES(false);
              }}
              aria-expanded={openWS}
              aria-haspopup="menu"
            >
              <span role="img" aria-label="members">
                👥
              </span>
              &nbsp; Workspace
              <span className="mega__caret">▾</span>
            </button>

            <div
              ref={wsMenuRef}
              className={`mega__menu mega__menu--narrow ${
                openWS ? "show" : ""
              }`}
              role="menu"
            >
              <div className="mega__grid mega__grid--2">
                <div className="mega__col">
                  <div className="mega__heading">TOOLKIT</div>
                  <MegaItem
                    title="Text to 3D"
                    desc="Generate 3D models from prompts"
                  />
                  <MegaItem
                    title="Image to 3D"
                    desc="Generate 3D models from images"
                  />
                  <MegaItem
                    title="AI Texturing"
                    desc="Generate textures from prompts or images"
                  />
                  <MegaItem
                    title="Text to Image"
                    desc="Generate images from prompts"
                  />
                </div>
                <div className="mega__col">
                  <div className="mega__heading">3D TO VIDEO</div>
                  <MegaItem
                    title="3D to Image (Beta)"
                    desc="Generate images from 3D scenes"
                  />
                  <MegaItem
                    title="Image to Video (Beta)"
                    desc="Generate videos from prompts"
                  />
                </div>
              </div>
            </div>
          </div>

          <NavLink to="/my-dashboard">My Dashboard</NavLink>
          <NavLink to="/assets">My Assets</NavLink>
          <NavLink to="/api">API</NavLink>

          {/* RESOURCES (mega menu 4 cột – fixed + clamp) */}
          <div className="mega">
            <button
              ref={resBtnRef}
              className={`mega__trigger ${openRES ? "is-open" : ""}`}
              onClick={() => {
                setOpenRES((v) => !v);
                setOpenWS(false);
              }}
              aria-expanded={openRES}
              aria-haspopup="menu"
            >
              Resources <span className="mega__caret">▾</span>
            </button>

            <div
              ref={resMenuRef}
              className={`mega__menu mega__menu--wide mega__menu--fixed ${
                openRES ? "show" : ""
              }`}
              role="menu"
            >
              <div className="mega__grid mega__grid--4">
                {/* LEARN */}
                <div className="mega__col">
                  <div className="mega__heading">LEARN</div>
                  <MegaItem
                    title="Tutorials"
                    desc="Find guides, use cases and techniques"
                  />
                  <MegaItem
                    title="Blog"
                    desc="Read news, user stories and more"
                  />
                  <MegaItem
                    title="Documentation"
                    desc="Learn about our API, plugins and more"
                  />
                  <MegaItem
                    title="Help Center"
                    desc="Get answers and ask for support"
                  />
                </div>
                {/* PROGRAMS */}
                <div className="mega__col">
                  <div className="mega__heading">PROGRAMS</div>
                  <MegaItem
                    title="Affiliate Program"
                    desc="Earn commissions by promoting DTL"
                  />
                  <MegaItem
                    title="Creator Program"
                    desc="Get sponsorship for your projects"
                  />
                  <MegaItem
                    title="Fellowship Program"
                    desc="Our giving back to academia"
                  />
                  <MegaItem
                    title="Referral Program"
                    desc="Earn up to 3 free months of Pro"
                  />
                  <MegaItem
                    title="Education Program"
                    desc="Discounts for students/educators"
                  />
                </div>
                {/* DOWNLOADS */}
                <div className="mega__col">
                  <div className="mega__heading">DOWNLOADS</div>
                  <MegaItem
                    title="Media Kit"
                    desc="Present DTL’s brand the right way"
                  />
                  <MegaItem
                    title="Blender Plugin"
                    desc="Download the plugin for Blender"
                  />
                  <MegaItem
                    title="Godot Plugin"
                    desc="Download the plugin for Godot"
                  />
                  <MegaItem
                    title="Unity Plugin"
                    desc="Download the plugin for Unity"
                  />
                  <MegaItem
                    title="Unreal Plugin"
                    desc="Download the plugin for Unreal"
                  />
                  <MegaItem
                    title="Maya Plugin"
                    desc="Download the plugin for Maya"
                  />
                </div>
                {/* TOOLS */}
                <div className="mega__col">
                  <div className="mega__heading">TOOLS</div>
                  <MegaItem
                    title="3D File Converter"
                    desc="Convert 3D files to other formats and download for free"
                  />
                  <MegaItem
                    title="Online 3D Viewer"
                    desc="Upload and view your 3D models in browser"
                  />
                </div>
              </div>
            </div>
          </div>

          <NavLink to="/join">Join Us</NavLink>
        </nav>
      </div>

      <div className="header__actions">
        <span className="pill">100</span>
        <button
          className="btn btn--upgrade"
          onClick={() => openModal("monthly")}
        >
          Upgrade
        </button>
        <button className="btn btn--icon" title="Gifts">
          🎁
        </button>
        <button className="btn btn--icon" title="Notifications">
          🔔
        </button>
        <UserAvatarMenu
          displayName="user"
          // avatarUrl="https://..." // tuỳ chọn: truyền URL ảnh avatar
          // email="ban@example.com" // tuỳ chọn: hiện email trong menu
          loginRoute="/" // chuyển ra trang Home khi logout
          onLogoutAPI={async () => {
            // nếu cần gọi API logout, đặt ở đây
          }}
        />
      </div>
    </header>
  );
}

/** Item trong mega menu */
function MegaItem({ title, desc }: { title: string; desc: string }) {
  return (
    <Link to="#" className="mega__item" role="menuitem">
      <span className="mega__title">{title}</span>
      <span className="mega__desc">{desc}</span>
    </Link>
  );
}
