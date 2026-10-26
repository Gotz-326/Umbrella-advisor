import { NavLink, Outlet } from "react-router-dom";
const tabs = [
  { to: "users", label: "ユーザー一覧" },
  { to: "settings", label: "通知設定" },
];

const AdminLayout = () => {
  return (
    <div className="admin">
      <nav style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: "1px solid #d9e0e7" }}>
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            style={({ isActive }) => ({
              padding: "10px 14px",
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: isActive ? "#1e40af" : "#52606d",
              fontWeight: isActive ? 700 : 400,
              borderBottom: isActive ? "2px solid #1e40af" : "2px solid transparent",
            })}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default AdminLayout;