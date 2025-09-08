import React from "react";
import "./dashboard.css";

export default function Dashboard() {
  const userName = "user"; // demo, sau này thay state

  return (
    <div className="dash">
      {/* Thanh thông báo plan */}

      {/* Hàng promotion */}
      <div className="promo-row">
        <div className="promo-card promo-large">
          <span className="badge">PROMOTION</span>
          <h3>
            Monthly & Annual PRO <strong>50% OFF</strong>
          </h3>
        </div>

        <div className="promo-card">
          <span className="badge">EVENTS</span>
          <h4>#PBR# Generation Challenge</h4>
          <button className="mini">Generate PBR Maps</button>
        </div>

        <div className="promo-card">
          <span className="badge">COMMUNITY</span>
          <h4>Cinematic 3D Tips & Tricks</h4>
        </div>

        <div className="promo-card">
          <span className="badge">TEXT TO IMAGE</span>
          <h4>New AI Model</h4>
        </div>

        <div className="promo-card">
          <span className="badge">COMMUNITY</span>
          <h4>DTL Creator Spotlight</h4>
        </div>
      </div>

      {/* Greeting */}
      <h2 className="greeting">
        Hi, <span className="highlight">{userName}</span>! How can DTL help you
        today?
      </h2>

      {/* Feature cards */}
      <div className="feature-row">
        <div className="feature-card">
          <div className="fi" />
          <div>
            <h5>Text to 3D</h5>
            <p>Generate 3D models from prompts</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="fi" />
          <div>
            <h5>Image to 3D</h5>
            <p>Generate 3D models from images</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="fi" />
          <div>
            <h5>AI Texturing</h5>
            <p>Generate textures from prompts or images</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="fi" />
          <div>
            <h5>Text to Image</h5>
            <p>Generate images from prompts</p>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="search-bar">
        <input placeholder="Search model / user" />
        <button className="icon">🔍</button>
        <button className="icon">🧩</button>
        <button className="icon">⚙️</button>
        <div className="tabs">
          <button className="tab active">Trending</button>
          <button className="tab">Following</button>
          <button className="tab">Featured</button>
          <button className="tab">New</button>
          <button className="tab">Most Downloaded</button>
          <button className="tab">Top</button>
        </div>
        <div className="right-actions">
          <button className="dropdown">All Categories ▾</button>
          <button className="icon">🛒</button>
          <button className="icon">⋯</button>
        </div>
      </div>

      {/* Tag row */}
      <div className="tag-row">
        {[
          "cyberpunk",
          "#PBR#",
          "pbr",
          "character",
          "creature",
          "warrior",
          "animal",
          "scifi",
          "weapon",
          "magic",
          "nature",
          "female",
        ].map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
