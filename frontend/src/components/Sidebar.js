import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navLinks = [
  { to: '/', label: 'D', title: 'Dashboard' },
];

function Sidebar() {
  return (
    <div className="sidebar">
      {navLinks.map(link => (
        <NavLink 
          key={link.to}
          to={link.to} 
          className="sidebar-icon" 
          title={link.title}
          end // Use 'end' for the root path to avoid it matching everything
        >
          {link.label}
        </NavLink>
      ))}

      <div className="sidebar-divider"></div>
      
      <NavLink 
        to="/admin/add-members" 
        className="sidebar-icon admin-link" 
        title="Add Members"
      >
        A
      </NavLink>
    </div>
  );
}

export default Sidebar;

