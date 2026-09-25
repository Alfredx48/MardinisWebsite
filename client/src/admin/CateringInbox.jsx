import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faCalendarDay,
	faChampagneGlasses,
	faEnvelope,
	faPhone,
	faTrash,
	faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { formatDateTime, telHref } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import { useAdmin } from "./AdminContext";
import { ConfirmDialog, PageHeader } from "./adminUi";
import { CATERING_STATUSES, plainDate } from "./adminUtils";

const STATUS_BADGE = { new: "badge-terracotta", contacted: "badge-info", booked: "badge-success", closed: "" };

function Inquiry({ inquiry, onChange, onDelete }) {
	const [notes, setNotes] = useState(inquiry.admin_notes || "");
	const [saving, setSaving] = useState(false);
	const dirty = notes !== (inquiry.admin_notes || "");

	useEffect(() => setNotes(inquiry.admin_notes || ""), [inquiry.admin_notes]);

	const patch = async (attrs, message) => {
		setSaving(true);
		try {
			const updated = await api.patch(`/admin/catering_inquiries/${inquiry.id}`, attrs);
			onChange(updated);
			toast.success(message);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setSaving(false);
		}
	};

	const label = CATERING_STATUSES.find(([v]) => v === inquiry.status)?.[1] || inquiry.status;

	return (
		<article className={`card adm-inquiry is-${inquiry.status}`}>
			<header className="adm-inquiry-head">
				<div>
					<h2 className="adm-inquiry-name">{inquiry.name}</h2>
					<div className="muted small">Received {formatDateTime(inquiry.created_at)}</div>
				</div>
				<span className={`badge badge-dot ${STATUS_BADGE[inquiry.status] || ""}`}>{label}</span>
			</header>

			<ul className="adm-inquiry-facts">
				<li>
					<FontAwesomeIcon icon={faCalendarDay} fixedWidth />
					{inquiry.event_date ? plainDate(inquiry.event_date) : <span className="muted">No date given</span>}
				</li>
				<li>
					<FontAwesomeIcon icon={faUserGroup} fixedWidth />
					{inquiry.guest_count ? `${inquiry.guest_count} guests` : <span className="muted">Guests not given</span>}
				</li>
				<li>
					<FontAwesomeIcon icon={faPhone} fixedWidth />
					<a href={telHref(inquiry.phone)}>{inquiry.phone}</a>
				</li>
				{inquiry.email && (
					<li className="adm-break">
						<FontAwesomeIcon icon={faEnvelope} fixedWidth />
						<a href={`mailto:${inquiry.email}?subject=${encodeURIComponent("Your catering request")}`}>
							{inquiry.email}
						</a>
					</li>
				)}
			</ul>

			{inquiry.message ? (
				<blockquote className="adm-inquiry-message">{inquiry.message}</blockquote>
			) : (
				<p className="muted small">No message.</p>
			)}

			<div className="adm-inquiry-controls">
				<div className="field">
					<label htmlFor={`inq-status-${inquiry.id}`}>Status</label>
					<select
						id={`inq-status-${inquiry.id}`}
						className="select"
						value={inquiry.status}
						disabled={saving}
						onChange={(e) =>
							patch(
								{ status: e.target.value },
								`Marked ${CATERING_STATUSES.find(([v]) => v === e.target.value)[1].toLowerCase()}`
							)
						}
					>
						{CATERING_STATUSES.map(([value, text]) => (
							<option key={value} value={value}>
								{text}
							</option>
						))}
					</select>
				</div>
				<div className="field adm-grow">
					<label htmlFor={`inq-notes-${inquiry.id}`}>Internal notes</label>
					<textarea
						id={`inq-notes-${inquiry.id}`}
						className="textarea"
						rows={2}
						value={notes}
						placeholder="e.g. Quoted $18/person, follow up Friday"
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>
			</div>

			<footer className="row">
				{dirty && (
					<>
						<button
							type="button"
							className="btn btn-sm btn-primary"
							onClick={() => patch({ admin_notes: notes }, "Notes saved")}
							disabled={saving}
						>
							{saving ? "Saving…" : "Save notes"}
						</button>
						<button
							type="button"
							className="btn btn-sm btn-ghost"
							onClick={() => setNotes(inquiry.admin_notes || "")}
							disabled={saving}
						>
							Discard
						</button>
					</>
				)}
				{inquiry.status === "new" && !dirty && (
					<button
						type="button"
						className="btn btn-sm btn-secondary"
						onClick={() => patch({ status: "contacted" }, "Marked contacted")}
						disabled={saving}
					>
						Mark as contacted
					</button>
				)}
				<span className="spacer" />
				<button
					type="button"
					className="btn btn-sm btn-ghost adm-text-danger"
					onClick={() => onDelete(inquiry)}
					aria-label={`Delete inquiry from ${inquiry.name}`}
				>
					<FontAwesomeIcon icon={faTrash} /> Delete
				</button>
			</footer>
		</article>
	);
}

export default function CateringInbox() {
	const { refreshCatering } = useAdmin();
	const [inquiries, setInquiries] = useState(null);
	const [error, setError] = useState(null);
	const [chosenFilter, setFilter] = useState(null);
	const [deleting, setDeleting] = useState(null);

	const load = useCallback(async () => {
		try {
			setInquiries(await api.get("/admin/catering_inquiries"));
			setError(null);
		} catch (e) {
			setError(e);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const changed = (updated) => {
		setInquiries((list) => list.map((i) => (i.id === updated.id ? updated : i)));
		refreshCatering();
	};

	const remove = async () => {
		await api.delete(`/admin/catering_inquiries/${deleting.id}`);
		setInquiries((list) => list.filter((i) => i.id !== deleting.id));
		toast.success("Inquiry deleted");
		setDeleting(null);
		refreshCatering();
	};

	if (!inquiries) {
		if (error) {
			return (
				<EmptyState title="Couldn't load catering requests">
					<p>{error.message}</p>
					<button type="button" className="btn btn-secondary" onClick={load}>
						Try again
					</button>
				</EmptyState>
			);
		}
		return <Spinner label="Loading catering requests" />;
	}

	const count = (status) => inquiries.filter((i) => i.status === status).length;
	const tabs = [["all", "All", inquiries.length], ...CATERING_STATUSES.map(([v, l]) => [v, l, count(v)])];
	// Open on "New" when there's something to answer, otherwise show everything.
	const filter = chosenFilter || (count("new") > 0 ? "new" : "all");
	const shown = filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

	return (
		<div className="adm-page">
			<PageHeader title="Catering" subtitle="Requests from the catering form on the website." />

			<div className="adm-tabs" role="group" aria-label="Filter by status">
				{tabs.map(([value, text, n]) => (
					<button
						type="button"
						key={value}
						className="adm-tab"
						aria-pressed={filter === value}
						onClick={() => setFilter(value)}
					>
						{text}
						<span className="adm-tab-count">{n}</span>
					</button>
				))}
			</div>

			{shown.length === 0 ? (
				<EmptyState icon={faChampagneGlasses} title={filter === "new" ? "No new requests" : "Nothing here"}>
					<p>
						{filter === "new"
							? "You're all caught up. New catering requests will appear here."
							: "No catering requests with this status."}
					</p>
				</EmptyState>
			) : (
				<div className="adm-inquiries">
					{shown.map((inq) => (
						<Inquiry key={inq.id} inquiry={inq} onChange={changed} onDelete={setDeleting} />
					))}
				</div>
			)}

			{deleting && (
				<ConfirmDialog
					title="Delete this inquiry?"
					confirmLabel="Delete"
					danger
					onConfirm={remove}
					onClose={() => setDeleting(null)}
				>
					<p>
						The request from <strong>{deleting.name}</strong> will be removed permanently.
					</p>
				</ConfirmDialog>
			)}
		</div>
	);
}
