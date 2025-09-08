import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuthDrawer } from "../context/AuthDrawerContext";
import "./header.css";

export default function HeaderHome() {
  const { openWith } = useAuthDrawer();

  return (
    <header className="header header--home">
      <div className="header__left">
        <Link to="/" className="header__brand">
          DTL
        </Link>
        <nav className="header__nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/resources">Resources</NavLink>
        </nav>
      </div>

      <div className="header__actions">
        <button className="btn btn--ghost" onClick={() => openWith("signin")}>
          Sign In
        </button>
        <button className="btn btn--primary" onClick={() => openWith("signup")}>
          Sign Up - It's Free
        </button>
      </div>
    </header>
  );
}
