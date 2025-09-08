//import React from "react";
import React, { useEffect } from "react";
import "./home.css";
import { useAuthDrawer } from "../context/AuthDrawerContext";
import { ping } from "../lib/jsonStore";
import { supabase } from "../lib/supabase";

export default function Home() {
  const { openWith } = useAuthDrawer();

  useEffect(() => {
    (async () => {
      try {
        const t = await ping();
        console.log("[Neon ping ok]", t);
        supabase.auth.getSession().then(({ data }) => {
          console.log("[supabase] session:", data.session); // null nếu chưa đăng nhập
        });
      } catch (e) {
        console.error("[Neon ping error]", e);
      }
    })();
  }, []);

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="announcement">
          <span>🚀 We're growing fast – join us!</span>
        </div>

        <h1 className="title">
          The #1 AI 3D Model Generator <br /> for Creators
        </h1>

        <p className="subtitle">
          Trusted by game developers, game studios, 3D printing enthusiasts, and
          XR creators worldwide to bring their visions to life—DTL lets you
          create 3D models and animations in seconds.
        </p>

        <div className="cta-row">
          <button className="cta-primary" onClick={() => openWith("signup")}>
            Start for Free
          </button>
          <a className="cta-secondary" href="#">
            Explore 3D Models →
          </a>
        </div>

        {/* (tùy chọn) hàng logo đối tác */}
        <div className="logo-row">
          <span className="logo-dot" />
          <span className="logo-dot" />
          <span className="logo-dot" />
          <span className="logo-dot" />
          <span className="logo-dot" />
        </div>
      </div>
    </section>
  );
}
