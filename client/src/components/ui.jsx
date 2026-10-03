import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";

export function Spinner({ label = "Loading" }) {
	return (
		<div className="loading-block" role="status">
			<div className="spinner" />
			<span className="sr-only">{label}</span>
		</div>
	);
}

export function EmptyState({ icon, title, children }) {
	return (
		<div className="empty-state">
			{icon && <FontAwesomeIcon icon={icon} />}
			{title && <h3>{title}</h3>}
			{children}
		</div>
	);
}

// The number can be typed as well (handy for 24 kabobs). A valid number applies
// as it's typed; anything else (blank, 0, too many) is settled on leaving the box.
export function QuantityStepper({ value, onChange, min = 1, max = 50, small = false, label = "Quantity" }) {
	const [draft, setDraft] = useState(null); // the text while someone is typing
	const step = (next) => {
		setDraft(null);
		onChange(next);
	};
	const type = (e) => {
		const text = e.target.value.replace(/\D/g, "").slice(0, 3);
		setDraft(text);
		const n = Number(text);
		if (text && n >= Math.max(min, 1) && n <= max) onChange(n);
	};
	const settle = () => {
		if (draft === null) return;
		if (draft !== "") {
			const n = Math.min(max, Math.max(min, Number(draft)));
			if (n !== value) onChange(n);
		}
		setDraft(null);
	};
	return (
		<div className={`stepper${small ? " stepper-sm" : ""}`} role="group" aria-label={label}>
			<button type="button" onClick={() => step(value - 1)} disabled={value <= min} aria-label="Decrease">
				<FontAwesomeIcon icon={faMinus} />
			</button>
			<input
				className="stepper-input"
				type="text"
				inputMode="numeric"
				aria-label={label}
				value={draft ?? String(value)}
				onFocus={(e) => e.target.select()}
				onChange={type}
				onBlur={settle}
				onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
			/>
			<button type="button" onClick={() => step(value + 1)} disabled={value >= max} aria-label="Increase">
				<FontAwesomeIcon icon={faPlus} />
			</button>
		</div>
	);
}

// Locks page scroll and closes on Escape while mounted.
export function useDismiss(onClose) {
	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && onClose();
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			document.removeEventListener("keydown", onKey);
		};
	}, [onClose]);
}

export function Modal({ onClose, label, children, className = "" }) {
	const ref = useRef(null);
	useDismiss(onClose);
	useEffect(() => {
		ref.current?.focus();
	}, []);

	return (
		<div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
			<div
				className={`modal ${className}`}
				role="dialog"
				aria-modal="true"
				aria-label={label}
				tabIndex={-1}
				ref={ref}
			>
				<button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
					<FontAwesomeIcon icon={faXmark} />
				</button>
				{children}
			</div>
		</div>
	);
}

export function Switch({ checked, onChange, disabled, label }) {
	return (
		<label className="switch">
			<input
				type="checkbox"
				checked={!!checked}
				disabled={disabled}
				onChange={(e) => onChange(e.target.checked)}
				aria-label={label}
			/>
			<span />
		</label>
	);
}

// Dish photo that falls back to a warm gradient + initials when there's no
// photo or it fails to load (e.g. a hotlinked image that's been taken down).
export function DishImage({ src, name, className = "" }) {
	const [failedSrc, setFailedSrc] = useState(null);
	if (src && failedSrc !== src) {
		return <img className={className} src={src} alt={name} loading="lazy" onError={() => setFailedSrc(src)} />;
	}
	const initials = (name || "")
		.split(/\s+/)
		.filter((w) => /^[A-Za-z]/.test(w))
		.slice(0, 2)
		.map((w) => w[0])
		.join("");
	return (
		<div className={`dish-placeholder ${className}`} aria-hidden="true">
			<span>{initials}</span>
		</div>
	);
}
