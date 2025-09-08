import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthDrawer } from "../context/AuthDrawerContext";
import "./header.css";

export default function Header() {
  const { openWith } = useAuthDrawer();

  return (
    <header className="site-header">
      <div className="header-left">
        <Link to="/" className="brand">
          <span className="brand-accent">DTL</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/community">Community</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/api">API</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/resources">Resources</NavLink>
        </nav>
      </div>

      <div className="header-right">
        <button className="ghost" onClick={() => openWith("signin")}>
          Sign In
        </button>
        <button className="primary" onClick={() => openWith("signup")}>
          Sign Up - It's Free
        </button>
      </div>
    </header>
  );
}
