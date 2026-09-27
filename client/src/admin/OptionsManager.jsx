import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListCheck, faPen, faPlus, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { money } from "../format";
import { ruleLabel } from "../modifiers";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { ConfirmDialog, FormErrors, PageHeader } from "./adminUi";
import { errorList } from "./adminUtils";

const MAX_OPTIONS = 30;

function usedByText(group, itemNames) {
	const names = group.menu_item_ids.map((id) => itemNames[id]).filter(Boolean);
	if (!names.length) return "Not on any items yet";
	if (names.length <= 3) return `On ${names.join(", ")}`;
	return `On ${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

function GroupEditor({ group, onClose, onSaved }) {
	const [form, setForm] = useState({
		name: group?.name || "",
		min_select: group?.min ?? 0,
		max_select: group?.max ?? "",
		options: group?.options.map((o) => ({ ...o })) || [{ name: "", price: "" }],
	});
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState(null);
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
	const setOption = (index, key) => (e) =>
		setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? { ...o, [key]: e.target.value } : o)) }));
	const addOption = () => setForm((f) => ({ ...f, options: [...f.options, { name: "", price: "" }] }));
	const removeOption = (index) => setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));

	const min = Number(form.min_select) || 0;
	const max = form.max_select === "" ? null : Number(form.max_select);

	const submit = async (e) => {
		e.preventDefault();
		setSaving(true);
		setErrors(null);
		const body = {
			name: form.name.trim(),
			min_select: min,
			max_select: max ?? "",
			options: form.options.map((o) => ({ name: o.name.trim(), price: o.price === "" ? "0" : o.price })),
		};
		try {
			const saved = group
				? await api.patch(`/admin/modifier_groups/${group.id}`, body)
				: await api.post("/admin/modifier_groups", body);
			onSaved(saved, !group);
		} catch (err) {
			setErrors(errorList(err));
			setSaving(false);
		}
	};

	return (
		<Modal onClose={onClose} label={group ? `Edit ${group.name}` : "New option group"} className="adm-modal-lg">
			<form onSubmit={submit}>
				<div className="modal-body adm-form">
					<h2 className="adm-modal-title">{group ? "Edit option group" : "New option group"}</h2>
					<div className="field">
						<label htmlFor="group-name">Name customers see</label>
						<input
							id="group-name"
							className="input"
							placeholder="e.g. Bread Choice"
							maxLength={40}
							value={form.name}
							onChange={set("name")}
							required
							autoFocus={!group}
						/>
					</div>
					<div className="grid-2">
						<div className="field">
							<label htmlFor="group-min">Customers must pick at least</label>
							<input
								id="group-min"
								className="input"
								type="number"
								inputMode="numeric"
								min="0"
								max={form.options.length || 0}
								value={form.min_select}
								onChange={set("min_select")}
							/>
							<span className="hint">0 makes the group optional.</span>
						</div>
						<div className="field">
							<label htmlFor="group-max">Customers can pick at most</label>
							<input
								id="group-max"
								className="input"
								type="number"
								inputMode="numeric"
								min="1"
								placeholder="No limit"
								value={form.max_select}
								onChange={set("max_select")}
							/>
							<span className="hint">Leave empty for no limit. 1 means pick one.</span>
						</div>
					</div>
					<p className="adm-rule-preview">
						Customers will see: <strong>{ruleLabel({ min, max })}</strong>
					</p>

					<fieldset className="adm-fieldset adm-sizes">
						<legend className="label">Options</legend>
						<div className="adm-size-rows">
							{form.options.map((o, i) => (
								<div className="adm-size-row" key={i}>
									<input
										className="input"
										aria-label={`Option ${i + 1} name`}
										placeholder="e.g. Sourdough"
										maxLength={40}
										value={o.name}
										onChange={setOption(i, "name")}
										required
									/>
									<input
										className="input"
										aria-label={`Option ${i + 1} extra price`}
										placeholder="+$0.00"
										type="number"
										inputMode="decimal"
										min="0"
										max="999.99"
										step="0.01"
										value={o.price === "0.00" ? "" : o.price}
										onChange={setOption(i, "price")}
									/>
									<button
										type="button"
										className="btn btn-ghost btn-sm"
										onClick={() => removeOption(i)}
										disabled={form.options.length === 1}
										aria-label={`Remove option ${o.name || i + 1}`}
									>
										<FontAwesomeIcon icon={faXmark} />
									</button>
								</div>
							))}
						</div>
						{form.options.length < MAX_OPTIONS && (
							<button type="button" className="btn btn-secondary btn-sm" onClick={addOption}>
								<FontAwesomeIcon icon={faPlus} /> Add option
							</button>
						)}
						<p className="hint">Leave the price empty for options that don't cost extra.</p>
					</fieldset>
					{group && group.menu_item_ids.length > 0 && (
						<p className="hint">Changes apply to all {group.menu_item_ids.length} items that use this group.</p>
					)}
					<FormErrors errors={errors} />
				</div>
				<div className="modal-footer">
					<span className="spacer" />
					<button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
						Cancel
					</button>
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{saving ? "Saving…" : group ? "Save changes" : "Add group"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

export default function OptionsManager() {
	const [groups, setGroups] = useState(null);
	const [itemNames, setItemNames] = useState({});
	const [error, setError] = useState(null);
	const [editor, setEditor] = useState(null); // { group } or { group: null } for new
	const [deleting, setDeleting] = useState(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [list, categories] = await Promise.all([api.get("/admin/modifier_groups"), api.get("/admin/categories")]);
			const names = {};
			categories.forEach((c) => c.items.forEach((i) => (names[i.id] = i.name)));
			setItemNames(names);
			setGroups(list);
		} catch (e) {
			setError(e);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const saved = (group, isNew) => {
		setGroups((gs) => (isNew ? [...gs, group] : gs.map((g) => (g.id === group.id ? group : g))));
		setEditor(null);
		toast.success(isNew ? `Added ${group.name}` : `Saved ${group.name}`);
	};

	const remove = async () => {
		await api.delete(`/admin/modifier_groups/${deleting.id}`);
		setGroups((gs) => gs.filter((g) => g.id !== deleting.id));
		toast.success(`Deleted ${deleting.name}`);
		setDeleting(null);
	};

	const totalItems = useMemo(() => new Set((groups || []).flatMap((g) => g.menu_item_ids)).size, [groups]);

	if (!groups) {
		if (error) {
			return (
				<EmptyState title="Couldn't load options">
					<p>{error.message}</p>
					<button type="button" className="btn btn-secondary" onClick={load}>
						Try again
					</button>
				</EmptyState>
			);
		}
		return <Spinner label="Loading options" />;
	}

	return (
		<div className="adm-page">
			<PageHeader
				title="Options"
				subtitle={
					groups.length
						? `${groups.length} option groups on ${totalItems} items. Attach groups to items in Menu → edit item.`
						: "Choices customers make, like bread, cheese, extras or spice level."
				}
			>
				<button type="button" className="btn btn-primary" onClick={() => setEditor({ group: null })}>
					<FontAwesomeIcon icon={faPlus} /> New group
				</button>
			</PageHeader>

			{groups.length === 0 ? (
				<EmptyState icon={faListCheck} title="No option groups yet">
					<p>
						Create a group like "Bread Choice", then attach it to items in <Link to="/admin/menu">Menu</Link>.
					</p>
				</EmptyState>
			) : (
				<div className="adm-option-groups">
					{groups.map((g) => (
						<article key={g.id} className="adm-card adm-option-group">
							<header>
								<div>
									<h2>{g.name}</h2>
									<p className={`adm-option-rule${g.min > 0 ? " is-required" : ""}`}>{ruleLabel(g)}</p>
								</div>
								<div className="adm-option-actions">
									<button
										type="button"
										className="adm-icon-btn"
										onClick={() => setEditor({ group: g })}
										aria-label={`Edit ${g.name}`}
									>
										<FontAwesomeIcon icon={faPen} />
									</button>
									<button
										type="button"
										className="adm-icon-btn adm-text-danger"
										onClick={() => setDeleting(g)}
										aria-label={`Delete ${g.name}`}
									>
										<FontAwesomeIcon icon={faTrash} />
									</button>
								</div>
							</header>
							<ul className="adm-option-list">
								{g.options.map((o) => (
									<li key={o.name}>
										{o.name}
										{Number(o.price) > 0 && <span className="adm-option-price">+{money(o.price)}</span>}
									</li>
								))}
							</ul>
							<p className="adm-option-used">{usedByText(g, itemNames)}</p>
						</article>
					))}
				</div>
			)}

			{editor && <GroupEditor group={editor.group} onClose={() => setEditor(null)} onSaved={saved} />}
			{deleting && (
				<ConfirmDialog
					title={`Delete ${deleting.name}?`}
					confirmLabel="Delete group"
					danger
					onConfirm={remove}
					onClose={() => setDeleting(null)}
				>
					<p>
						{deleting.menu_item_ids.length
							? `It will be removed from ${deleting.menu_item_ids.length} items. `
							: ""}
						Past orders keep the options customers chose.
					</p>
				</ConfirmDialog>
			)}
		</div>
	);
}
