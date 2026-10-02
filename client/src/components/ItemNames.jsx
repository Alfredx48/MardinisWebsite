import { useState } from "react";
import { useCart } from "../context/CartContext";
import { NAME_MAX, isBlank, nameCounts, padNames } from "../itemNames";

// One name box per item, for group orders: 3 wraps get 3 boxes.
export function NameInputs({ count, names, onChange, autoFocus = false }) {
	const values = padNames(names, count);
	const set = (index, value) => onChange(values.map((v, i) => (i === index ? value : v)));
	return (
		<div className={`name-inputs${count > 1 ? " is-multi" : ""}`}>
			{values.map((value, i) => (
				<label key={i} className="name-input">
					{count > 1 && <span className="name-input-num">{i + 1}</span>}
					<input
						className="input"
						maxLength={NAME_MAX}
						placeholder={count > 1 ? "Name" : "e.g. Sarah"}
						aria-label={count > 1 ? `Name for item ${i + 1}` : "Name for this item"}
						autoFocus={autoFocus && i === 0}
						value={value}
						onChange={(e) => set(i, e.target.value)}
					/>
				</label>
			))}
		</div>
	);
}

// "For: Sarah, Mike ×2 · 1 without a name"
export function NamesSummary({ names, quantity }) {
	const { named, unnamed } = nameCounts(names, quantity);
	if (!named.length) return null;
	return (
		<p className="cart-line-label">
			For:{" "}
			{named.map((n, i) => (
				<span key={n.name}>
					{i > 0 && ", "}
					<strong>{n.name}</strong>
					{n.count > 1 && ` ×${n.count}`}
				</span>
			))}
			{unnamed > 0 && <span className="cart-line-unnamed"> · {unnamed} without a name</span>}
		</p>
	);
}

// Names on a cart line, editable in place.
export function LineNames({ line }) {
	const { setLabels } = useCart();
	const [editing, setEditing] = useState(false);
	const hasNames = line.labels.some((n) => !isBlank(n));

	if (editing) {
		return (
			<div className="line-names">
				<span className="line-names-title">{line.quantity > 1 ? "A name for each" : "Name for this item"}</span>
				<NameInputs autoFocus count={line.quantity} names={line.labels} onChange={(n) => setLabels(line.key, n)} />
				<button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
					Done
				</button>
			</div>
		);
	}
	return (
		<>
			<NamesSummary names={line.labels} quantity={line.quantity} />
			<button type="button" className="link-btn line-names-edit" onClick={() => setEditing(true)}>
				{hasNames ? "Edit names" : line.quantity > 1 ? "+ Add names" : "+ Add a name"}
			</button>
		</>
	);
}
