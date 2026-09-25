import { Navigate, Route, Routes } from "react-router-dom";
import { AdminProvider } from "./AdminContext";
import AdminLayout from "./AdminLayout";
import Dashboard from "./Dashboard";
import LiveOrders from "./LiveOrders";
import OrderHistory from "./OrderHistory";
import MenuManager from "./MenuManager";
import CateringInbox from "./CateringInbox";
import Customers from "./Customers";
import Settings from "./Settings";
import "./admin.css";

export default function AdminApp() {
	return (
		<AdminProvider>
			<Routes>
				<Route element={<AdminLayout />}>
					<Route index element={<Dashboard />} />
					<Route path="orders" element={<LiveOrders />} />
					<Route path="history" element={<OrderHistory />} />
					<Route path="menu" element={<MenuManager />} />
					<Route path="catering" element={<CateringInbox />} />
					<Route path="users" element={<Customers />} />
					<Route path="settings" element={<Settings />} />
					<Route path="*" element={<Navigate to="/admin" replace />} />
				</Route>
			</Routes>
		</AdminProvider>
	);
}
