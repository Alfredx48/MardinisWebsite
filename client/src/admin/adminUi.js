import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "../components/ui";
import { PAYMENT_LABELS, STATUS_BADGES, STATUS_LABELS, errorList, paymentBadge } from "./adminUtils";

export function PageHeader({ title, subtitle, children }) {
	return (
		<header className="adm-page-header">
			<div>
				<h1>{title}</h1>
				{subtitle && <p className="muted">{subtitle}</p>}
			</div>
			{children && <div className="adm-page-actions">{children}</div>}
		</header>
	);
}

export function StatusBadge({ status }) {
	return <span className={`badge badge-dot ${STATUS_BADGES[status] || ""}`}>{STATUS_LABELS[status] || status}</span>;
}

export function PaymentBadge({ order }) {
	const { label, className } = paymentBadge(order);
	return (
		<span className={`badge ${className}`} title={PAYMENT_LABELS[order.payment_method]}>
			{label}
		</span>
	);
}

export function FormErrors({ errors }) {
	if (!errors || errors.length === 0) return null;
	return (
		<div className="form-error" role="alert">
			{errors.length === 1 ? (
				errors[0]
			) : (
				<ul className="adm-error-list">
					{errors.map((e) => (
						<li key={e}>{e}</li>
					))}
				</ul>
			)}
		</div>
	);
}

// Confirmation modal for destructive or important actions. `onConfirm` may be async;
// errors it throws are shown inside the dialog.
export function ConfirmDialog({
	title,
	children,
	confirmLabel = "Confirm",
	danger = false,
	onConfirm,
	onClose,
}) {
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState(null);

	const confirm = async () => {
		setBusy(true);
		setErrors(null);
		try {
			await onConfirm();
		} catch (e) {
			setErrors(errorList(e));
			setBusy(false);
		}
	};

	return (
		<Modal onClose={busy ? () => {} : onClose} label={title} className="adm-confirm">
			<div className="modal-body">
				<div className="adm-confirm-head">
					{danger && (
						<span className="adm-confirm-icon" aria-hidden="true">
							<FontAwesomeIcon icon={faTriangleExclamation} />
						</span>
					)}
					<h2 className="adm-modal-title">{title}</h2>
				</div>
				<div className="adm-confirm-text">{children}</div>
				<FormErrors errors={errors} />
			</div>
			<div className="modal-footer">
				<span className="spacer" />
				<button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
					Keep it
				</button>
				<button
					type="button"
					className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
					onClick={confirm}
					disabled={busy}
				>
					{busy ? "Working…" : confirmLabel}
				</button>
			</div>
		</Modal>
	);
}

// Small "⋮" overflow menu. items: [{ label, icon, onClick, danger, disabled }]
export function OverflowMenu({ items, label = "More actions" }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const menuId = useId();

	useEffect(() => {
		if (!open) return undefined;
		const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
		const onKey = (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("touchstart", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("touchstart", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	useEffect(() => {
		if (open) ref.current?.querySelector("[role=menuitem]:not(:disabled)")?.focus();
	}, [open]);

	const onMenuKey = (e) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const buttons = [...ref.current.querySelectorAll("[role=menuitem]:not(:disabled)")];
		const index = buttons.indexOf(document.activeElement);
		const next = e.key === "ArrowDown" ? index + 1 : index - 1;
		buttons[(next + buttons.length) % buttons.length]?.focus();
	};

	return (
		<div className="adm-menu" ref={ref}>
			<button
				type="button"
				className="adm-icon-btn"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen((o) => !o)}
			>
				<FontAwesomeIcon icon={faEllipsisVertical} />
			</button>
			{open && (
				<div className="adm-menu-list" role="menu" id={menuId} onKeyDown={onMenuKey}>
					{items.map((item) => (
						<button
							key={item.label}
							type="button"
							role="menuitem"
							className={item.danger ? "is-danger" : ""}
							disabled={item.disabled}
							onClick={() => {
								setOpen(false);
								item.onClick();
							}}
						>
							{item.icon && <FontAwesomeIcon icon={item.icon} fixedWidth />}
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------- hooks */
export function useDebounced(value, delay = 300) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

// Re-renders every `ms` so "12 min ago" labels stay current.
export function useNow(ms = 30000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), ms);
		return () => clearInterval(id);
	}, [ms]);
	return now;
}

// Calls `fn` now and every `ms` while the tab is visible; pauses when hidden and
// refreshes immediately when the tab becomes visible or regains focus.
export function usePolling(fn, ms) {
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const lastRun = useRef(0);

	// Tab switches fire both "visibilitychange" and "focus"; don't fetch twice.
	const run = useCallback((force = false) => {
		if (!force && Date.now() - lastRun.current < 2000) return;
		lastRun.current = Date.now();
		fnRef.current();
	}, []);

	useEffect(() => {
		let id = null;
		const start = () => {
			if (id) return;
			id = setInterval(() => run(true), ms);
		};
		const stop = () => {
			clearInterval(id);
			id = null;
		};
		const onVisibility = () => {
			if (document.hidden) {
				stop();
			} else {
				run();
				start();
			}
		};
		const onFocus = () => {
			if (!document.hidden) run();
		};

		run(true);
		if (!document.hidden) start();
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("focus", onFocus);
		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("focus", onFocus);
		};
	}, [ms, run]);

	return useCallback(() => run(true), [run]);
}
