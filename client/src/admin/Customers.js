import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faShieldHalved, faUsers } from "@fortawesome/free-solid-svg-icons";
import { api, queryString } from "../api";
import { formatDate, telHref } from "../format";
import { EmptyState, Spinner, Switch } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog, PageHeader, useDebounced } from "./adminUi";

function AdminToggle({ user, isSelf, onRequest }) {
	return (
		<div className="adm-admin-toggle" title={isSelf ? "You can't remove your own admin access" : undefined}>
			<Switch
				checked={user.admin}
				disabled={isSelf}
				onChange={(v) => onRequest(user, v)}
				label={`${user.name} is an admin`}
			/>
			<span className="small muted" aria-hidden="true">
				{isSelf ? "You" : user.admin ? "Admin" : "Customer"}
			</span>
		</div>
	);
}

export default function Customers() {
	const { user: me } = useAuth();
	const [query, setQuery] = useState("");
	const [adminsOnly, setAdminsOnly] = useState(false);
	const q = useDebounced(query.trim(), 300);
	const [users, setUsers] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pending, setPending] = useState(null); // { user, admin }

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		api.get(`/admin/users${queryString({ q, admins: adminsOnly ? "true" : "" })}`)
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
	}, [q, adminsOnly]);

	const applyAdmin = async () => {
		const updated = await api.patch(`/admin/users/${pending.user.id}`, { admin: pending.admin });
		setUsers((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
		toast.success(updated.admin ? `${updated.name} is now an admin` : `${updated.name} is no longer an admin`);
		setPending(null);
	};

	const request = (user, admin) => setPending({ user, admin });

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
				<button type="button" className="adm-chip" aria-pressed={adminsOnly} onClick={() => setAdminsOnly((v) => !v)}>
					<FontAwesomeIcon icon={faShieldHalved} /> Admins only
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
									<th scope="col">Admin access</th>
								</tr>
							</thead>
							<tbody>
								{users.map((u) => (
									<tr key={u.id}>
										<td className="adm-strong">
											{u.name}
											{u.admin && <span className="badge badge-info adm-ml">Admin</span>}
										</td>
										<td className="adm-break">
											<a href={`mailto:${u.email}`}>{u.email}</a>
										</td>
										<td className="adm-nowrap">{u.phone ? <a href={telHref(u.phone)}>{u.phone}</a> : "—"}</td>
										<td className="num">{u.orders_count}</td>
										<td className="adm-nowrap">{formatDate(u.created_at, { year: "numeric", weekday: undefined })}</td>
										<td>
											<AdminToggle user={u} isSelf={u.id === me?.id} onRequest={request} />
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
									{u.admin && <span className="badge badge-info">Admin</span>}
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
									<AdminToggle user={u} isSelf={u.id === me?.id} onRequest={request} />
								</div>
							</li>
						))}
					</ul>
				</div>
			)}

			{pending && (
				<ConfirmDialog
					title={pending.admin ? `Make ${pending.user.name} an admin?` : `Remove admin access for ${pending.user.name}?`}
					confirmLabel={pending.admin ? "Make admin" : "Remove access"}
					danger={!pending.admin}
					onConfirm={applyAdmin}
					onClose={() => setPending(null)}
				>
					{pending.admin ? (
						<p>
							Admins can see every order and customer, change the menu, issue refunds and edit restaurant settings.
							Only give access to people you trust.
						</p>
					) : (
						<p>They'll no longer be able to open the admin area. Their customer account and orders stay as they are.</p>
					)}
				</ConfirmDialog>
			)}
		</div>
	);
}
