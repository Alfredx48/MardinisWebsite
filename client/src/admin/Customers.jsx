import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faShieldHalved, faUsers } from "@fortawesome/free-solid-svg-icons";
import { api, queryString } from "../api";
import { formatDate, telHref } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog, PageHeader, useDebounced } from "./adminUi";

const ROLES = [
	["customer", "Customer"],
	["kitchen", "Kitchen"],
	["admin", "Admin"],
];
const ROLE_LABELS = Object.fromEntries(ROLES);

const ROLE_HELP = {
	customer: "They'll lose access to the admin and the kitchen screen. Their customer account and orders stay as they are.",
	kitchen:
		"Kitchen staff can open the kitchen screen at /kitchen to see and move orders along. They can't refund, see order history or customers, or change the menu or settings.",
	admin:
		"Admins can see every order and customer, change the menu, issue refunds and edit restaurant settings. Only give access to people you trust.",
};

function RoleSelect({ user, isSelf, onRequest }) {
	return (
		<select
			className="select adm-role-select"
			value={user.role}
			disabled={isSelf}
			title={isSelf ? "You can't remove your own admin access" : undefined}
			aria-label={`Access for ${user.name}`}
			onChange={(e) => onRequest(user, e.target.value)}
		>
			{ROLES.map(([value, label]) => (
				<option key={value} value={value}>
					{isSelf && value === "admin" ? "Admin (you)" : label}
				</option>
			))}
		</select>
	);
}

function RoleBadge({ user }) {
	if (user.role === "customer") return null;
	return <span className={`badge ${user.admin ? "badge-info" : "badge-olive"}`}>{ROLE_LABELS[user.role]}</span>;
}

export default function Customers() {
	const { user: me } = useAuth();
	const [query, setQuery] = useState("");
	const [staffOnly, setStaffOnly] = useState(false);
	const q = useDebounced(query.trim(), 300);
	const [users, setUsers] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pending, setPending] = useState(null); // { user, role }

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		api.get(`/admin/users${queryString({ q, staff: staffOnly ? "true" : "" })}`)
			.then((list) => {
				if (cancelled) return;
				setUsers(list);
				setError(null);
			})
			.catch((e) => !cancelled && setError(e))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [q, staffOnly]);

	const applyRole = async () => {
		const updated = await api.patch(`/admin/users/${pending.user.id}`, { role: pending.role });
		setUsers((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
		toast.success(
			updated.role === "customer"
				? `${updated.name} no longer has staff access`
				: `${updated.name} now has ${ROLE_LABELS[updated.role].toLowerCase()} access`
		);
		setPending(null);
	};

	const request = (user, role) => setPending({ user, role });

	return (
		<div className="adm-page">
			<PageHeader
				title="Customers"
				subtitle={users ? `${users.length}${users.length === 200 ? "+" : ""} ${users.length === 1 ? "person" : "people"}` : " "}
			/>

			<div className="adm-toolbar">
				<div className="adm-search">
					<FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
					<label className="sr-only" htmlFor="users-q">
						Search customers
					</label>
					<input
						id="users-q"
						className="input"
						type="search"
						placeholder="Name, email or phone"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<button type="button" className="adm-chip" aria-pressed={staffOnly} onClick={() => setStaffOnly((v) => !v)}>
					<FontAwesomeIcon icon={faShieldHalved} /> Staff only
				</button>
			</div>

			{error && !loading ? (
				<EmptyState title="Couldn't load customers">
					<p>{error.message}</p>
				</EmptyState>
			) : !users ? (
				<Spinner label="Loading customers" />
			) : users.length === 0 ? (
				<EmptyState icon={faUsers} title="No one found">
					<p>{q ? "Try a different search." : "Customers appear here once they create an account."}</p>
				</EmptyState>
			) : (
				<div className={`adm-results${loading ? " is-loading" : ""}`} aria-busy={loading}>
					<div className="card adm-table-card adm-hide-mobile">
						<table className="adm-table">
							<thead>
								<tr>
									<th scope="col">Name</th>
									<th scope="col">Email</th>
									<th scope="col">Phone</th>
									<th scope="col" className="num">
										Orders
									</th>
									<th scope="col">Joined</th>
									<th scope="col">Access</th>
								</tr>
							</thead>
							<tbody>
								{users.map((u) => (
									<tr key={u.id}>
										<td className="adm-strong">
											{u.name} <RoleBadge user={u} />
										</td>
										<td className="adm-break">
											<a href={`mailto:${u.email}`}>{u.email}</a>
										</td>
										<td className="adm-nowrap">{u.phone ? <a href={telHref(u.phone)}>{u.phone}</a> : "—"}</td>
										<td className="num">{u.orders_count}</td>
										<td className="adm-nowrap">{formatDate(u.created_at, { year: "numeric", weekday: undefined })}</td>
										<td>
											<RoleSelect user={u} isSelf={u.id === me?.id} onRequest={request} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<ul className="adm-cards adm-show-mobile">
						{users.map((u) => (
							<li key={u.id} className="adm-user-card">
								<div className="row">
									<span className="adm-strong">{u.name}</span>
									<RoleBadge user={u} />
									<span className="spacer" />
									<span className="muted small">
										{u.orders_count} {u.orders_count === 1 ? "order" : "orders"}
									</span>
								</div>
								<div className="small adm-break">
									<a href={`mailto:${u.email}`}>{u.email}</a>
									{u.phone && (
										<>
											{" · "}
											<a href={telHref(u.phone)}>{u.phone}</a>
										</>
									)}
								</div>
								<div className="row">
									<span className="muted small">
										Joined {formatDate(u.created_at, { year: "numeric", weekday: undefined })}
									</span>
									<span className="spacer" />
									<RoleSelect user={u} isSelf={u.id === me?.id} onRequest={request} />
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{pending && (
				<ConfirmDialog
					title={
						pending.role === "customer"
							? `Remove staff access for ${pending.user.name}?`
							: `Give ${pending.user.name} ${ROLE_LABELS[pending.role].toLowerCase()} access?`
					}
					confirmLabel={pending.role === "customer" ? "Remove access" : `Make ${ROLE_LABELS[pending.role].toLowerCase()}`}
					danger={pending.role === "customer"}
					onConfirm={applyRole}
					onClose={() => setPending(null)}
				>
					<p>{ROLE_HELP[pending.role]}</p>
				</ConfirmDialog>
			)}
		</div>
	);
}
